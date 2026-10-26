// Node test bridge to the exact browser R1 module entry, not a production Worker shim.
import { parentPort } from 'node:worker_threads';
globalThis.self = {
  postMessage: message => parentPort.postMessage(message),
  addEventListener(type, listener) {
    if (type !== 'message') throw new Error('Unsupported test event');
    parentPort.on('message', data => listener({ data }));
  },
};
await import('../src/route-worker.mjs');
