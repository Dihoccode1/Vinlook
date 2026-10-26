const error = (code) => Object.assign(Error(code), { code });
export async function sha256(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
// Internal semantic descriptor, NOT the proposed shared R3 wire manifest.
// manifestAdapter must verify the approved schema/publication/artifact compatibility.
export function createPackageStore({
  storage,
  shell,
  manifestAdapter,
  fetchFile,
  estimate = async () => ({}),
  persist = async () => false,
  onChange = () => {},
}) {
  let busy = false;
  let snapshot = { status: 'not_downloaded' };
  const listeners = new Set();
  // A presentation callback cannot turn committed storage into a failed download.
  const notify = (value) => {
    snapshot = value;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {}
    }
    try {
      onChange(value);
    } catch {}
  };
  const validateFile = async (file, bytes) => {
    if (
      !(bytes instanceof ArrayBuffer) ||
      bytes.byteLength !== file.byteLength ||
      (await sha256(bytes)) !== file.sha256
    )
      throw error('CHECKSUM_MISMATCH');
  };
  const validate = (descriptor) => {
    if (
      !descriptor ||
      !Array.isArray(descriptor.files) ||
      !descriptor.files.length ||
      typeof descriptor.packageVersion !== 'string' ||
      !descriptor.packageVersion.trim() ||
      descriptor.packageVersion.length > 200
    )
      throw error('PACKAGE_INCOMPATIBLE');
    const ids = new Set();
    let total = 0;
    for (const file of descriptor.files) {
      if (
        !file ||
        typeof file.id !== 'string' ||
        !file.id.trim() ||
        file.id.length > 500 ||
        ids.has(file.id) ||
        !Number.isSafeInteger(file.byteLength) ||
        file.byteLength <= 0 ||
        !/^[a-f0-9]{64}$/.test(file.sha256)
      )
        throw error('PACKAGE_INCOMPATIBLE');
      ids.add(file.id);
      total += file.byteLength;
      if (!Number.isSafeInteger(total)) throw error('PACKAGE_INCOMPATIBLE');
    }
    return descriptor;
  };
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    async download(raw) {
      if (busy) throw error('DOWNLOAD_IN_PROGRESS');
      busy = true;
      let descriptor;
      try {
        if (typeof manifestAdapter !== 'function') throw error('MANIFEST_REVIEW_PENDING');
        descriptor = validate(structuredClone(await manifestAdapter(raw)));
        const active = await storage.active();
        if (active?.packageVersion === descriptor.packageVersion)
          throw error('PACKAGE_ALREADY_ACTIVE');
        const total = descriptor.files.reduce((sum, file) => sum + file.byteLength, 0);
        if (!Number.isSafeInteger(total)) throw error('PACKAGE_INCOMPATIBLE');
        let quota = {};
        try {
          quota = (await estimate()) ?? {};
        } catch {
          /* Optional browser hint; actual quota errors still fail closed. */
        }
        if (
          Number.isFinite(quota.quota) &&
          Number.isFinite(quota.usage) &&
          quota.quota - quota.usage < total * 1.2
        )
          throw error('QUOTA_INSUFFICIENT');
        let persistent = false;
        try {
          persistent = (await persist()) === true;
        } catch {
          /* Persistence is best effort, never a readiness guarantee. */
        }
        let verified = 0,
          verifiedBytes = 0;
        notify({
          status: 'downloading',
          packageVersion: descriptor.packageVersion,
          totalBytes: total,
          verifiedBytes,
          verifiedFiles: 0,
          totalFiles: descriptor.files.length,
          persistent,
        });
        for (const file of descriptor.files) {
          let bytes = await storage.file(descriptor.packageVersion, file.id);
          try {
            await validateFile(file, bytes);
          } catch {
            bytes = await fetchFile(file);
            await validateFile(file, bytes);
            await storage.putFile(descriptor.packageVersion, file.id, bytes);
          }
          verified++;
          verifiedBytes += file.byteLength;
          notify({
            status: 'verifying',
            packageVersion: descriptor.packageVersion,
            totalBytes: total,
            verifiedBytes,
            verifiedFiles: verified,
            totalFiles: descriptor.files.length,
            persistent,
          });
        }
        // Cache marker is outside IDB transaction; activation happens only after it succeeds.
        await shell.prepare(descriptor);
        await shell.markReady(descriptor.packageVersion);
        if (!(await shell.isReady(descriptor.packageVersion))) throw error('SHELL_INCOMPLETE');
        await storage.activate(descriptor);
        notify({
          status: 'ready',
          packageVersion: descriptor.packageVersion,
          totalBytes: total,
          verifiedBytes: total,
          verifiedFiles: verified,
          totalFiles: verified,
          persistent,
        });
        return descriptor;
      } catch (failure) {
        notify({
          status: 'incomplete',
          error:
            failure?.name === 'QuotaExceededError'
              ? 'QUOTA_EXCEEDED'
              : (failure?.code ?? 'DOWNLOAD_FAILED'),
        });
        throw failure;
      } finally {
        busy = false;
      }
    },
    async reopen() {
      if (busy) throw error('DOWNLOAD_IN_PROGRESS');
      busy = true;
      let active;
      try {
        active = await storage.active();
        if (!active) {
          const result = { status: 'not_downloaded' };
          notify(result);
          return result;
        }
        validate(active);
        if (!(await shell.isReady(active.packageVersion))) throw error('SHELL_INCOMPLETE');
        for (const file of active.files)
          await validateFile(file, await storage.file(active.packageVersion, file.id));
        const result = { status: 'ready', packageVersion: active.packageVersion, package: active };
        notify(result);
        return result;
      } catch {
        const result = {
          status: 'incomplete',
          packageVersion:
            typeof active?.packageVersion === 'string' ? active.packageVersion : undefined,
          error: 'LOCAL_DATA_MISSING',
        };
        notify(result);
        return result;
      } finally {
        busy = false;
      }
    },
    async withdraw(snapshot, hide) {
      if (
        snapshot?.complete !== true ||
        typeof snapshot.snapshotId !== 'string' ||
        !Array.isArray(snapshot.poiIds) ||
        snapshot.poiIds.some((id) => !/^[a-f0-9]{24}$/.test(id)) ||
        new Set(snapshot.poiIds).size !== snapshot.poiIds.length
      )
        throw error('WITHDRAWAL_INCOMPLETE');
      // Presentation only. Never delete cache/DB media based on failed/partial sync.
      await hide([...snapshot.poiIds]);
    },
  };
}
