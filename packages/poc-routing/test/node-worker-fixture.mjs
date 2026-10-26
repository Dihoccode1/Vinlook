// Node test bridge to the exact browser module entry, not a production Worker shim.
import { parentPort, workerData } from 'node:worker_threads';
globalThis.self = {
  postMessage: message => parentPort.postMessage(message),
  addEventListener(type, listener) {
    if (type !== 'message') throw new Error('Unsupported test event');
    parentPort.on('message', data => {
      if (workerData?.block && data.type === 'ROUTE_NODES') {
        // Deliberately unresponsive synchronous computation, only for termination proof.
        const state = new Int32Array(workerData.block);
        Atomics.store(state, 0, 1); Atomics.notify(state, 0); Atomics.wait(state, 1, 0);
      }
      listener({ data });
    });
  },
};
await import('../src/worker.mjs');
