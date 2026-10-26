/** Configured local dependencies only; does not certify full PoC/content readiness. */
export function createReadiness(connection) {
  let inflight = null;
  return () => {
    if (inflight) return inflight;
    if (connection.readyState !== 1) return Promise.resolve(false);
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(false);
      }, 3000);
    });
    const probe = async () => {
      try {
        await connection.db.command({ ping: 1 }, { timeoutMS: 2500, signal: controller.signal });
        const hello = await connection.db
          .admin()
          .command({ hello: 1 }, { timeoutMS: 2500, signal: controller.signal });
        return (
          connection.readyState === 1 &&
          hello.isWritablePrimary === true &&
          typeof hello.setName === 'string' &&
          hello.setName.length > 0
        );
      } catch {
        return false;
      }
    };
    inflight = Promise.race([probe(), timeout]).finally(() => {
      clearTimeout(timer);
      controller.abort();
      inflight = null;
    });
    return inflight;
  };
}
