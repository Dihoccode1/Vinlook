import mongoose from 'mongoose';
import { createInterface } from 'node:readline/promises';
import { planCatalog, applyCatalog } from '../src/catalog-operator.js';

let connection;
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.length === 1 && args[0] !== '--apply') throw Error();
  const uri = process.env.USAGE_MONGODB_URI;
  if (!uri || /\s/.test(uri) || !/^mongodb(?:\+srv)?:\/\//.test(uri)) throw Error();
  const parsed = new URL(uri);
  if (parsed.pathname !== '/vinlook_usage') throw Error();
  connection = mongoose.createConnection(uri, { autoCreate: false, autoIndex: false, bufferCommands: false,
    serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, socketTimeoutMS: 15000, maxPoolSize: 1 });
  await connection.asPromise();
  const plan = await planCatalog(connection);
  console.log(JSON.stringify({ mode: 'plan', ...plan }));
  if (args[0] === '--apply') {
    if (!process.stdin.isTTY) throw Error();
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    let confirmation;
    try { confirmation = await terminal.question(`Type vinlook_usage ${plan.fingerprint} to apply: `); }
    finally { terminal.close(); }
    console.log(JSON.stringify(await applyCatalog(connection, confirmation)));
  }
} catch (error) {
  console.error(JSON.stringify({ error: error?.message === 'USAGE_CATALOG_INCOMPLETE'
    ? 'USAGE_CATALOG_INCOMPLETE' : 'USAGE_CATALOG_REFUSED_OR_UNAVAILABLE',
  completed: Number.isSafeInteger(error?.completed) ? error.completed : 0, complete: false }));
  process.exitCode = 1;
} finally { await connection?.close().catch(() => {}); }
