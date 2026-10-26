// Native IndexedDB; no wrapper dependency or shared backend schema.
export function openOfflineStorage(indexedDB = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vinlook-poc-offline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('packages');
      db.createObjectStore('packageFiles');
      db.createObjectStore('settings');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('OFFLINE_STORAGE_BLOCKED'));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = (stores, mode, action) =>
        new Promise((done, fail) => {
          const tx = db.transaction(stores, mode);
          let result;
          try {
            result = action(tx);
          } catch (error) {
            tx.abort();
            fail(error);
            return;
          }
          tx.oncomplete = () => done(result?.result);
          tx.onerror = () => fail(tx.error);
          tx.onabort = () => fail(tx.error ?? Error('OFFLINE_STORAGE_ABORTED'));
        });
      resolve({
        active: () =>
          transaction(['settings'], 'readonly', (tx) =>
            tx.objectStore('settings').get('activePackage'),
          ),
        file: (version, id) =>
          transaction(['packageFiles'], 'readonly', (tx) =>
            tx.objectStore('packageFiles').get([version, id]),
          ),
        putFile: (version, id, bytes) =>
          transaction(['packageFiles'], 'readwrite', (tx) =>
            tx.objectStore('packageFiles').put(bytes, [version, id]),
          ),
        activate: (descriptor) =>
          transaction(['packages', 'settings'], 'readwrite', (tx) => {
            tx.objectStore('packages').put(descriptor, descriptor.packageVersion);
            tx.objectStore('settings').put(descriptor, 'activePackage');
          }),
        close: () => db.close(),
      });
    };
  });
}
