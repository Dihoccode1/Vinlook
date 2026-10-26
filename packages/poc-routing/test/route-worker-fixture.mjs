// Node test bridge to the exact browser R1 module entry, not a production Worker shim.
import { parentPort,workerData } from 'node:worker_threads';
if(workerData?.tileResponses){globalThis.fetch=async url=>new Response(workerData.tileResponses[url]??'',{status:Object.hasOwn(workerData.tileResponses,url)?200:404});}
globalThis.self = {
  postMessage: message => parentPort.postMessage(message),
  addEventListener(type, listener) {
    if (type !== 'message') throw new Error('Unsupported test event');
    parentPort.on('message', data => listener({ data }));
  },
};
await import('../src/route-worker.mjs');
