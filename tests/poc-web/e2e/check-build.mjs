import {readdir,readFile} from 'node:fs/promises';import {resolve} from 'node:path';
const directory=resolve('apps/web/dist');let files=0;
async function scan(path){for(const entry of await readdir(path,{withFileTypes:true})){const full=resolve(path,entry.name);if(entry.isDirectory())await scan(full);else if(entry.isFile()){files++;const content=await readFile(full,'utf8');if(/LOCAL (?:TEST |ADMIN |MONITOR |OFFLINE ).*FIXTURE|window\.(?:touristFixture|adminFixture|monitorFixture|offlineFixture)|fixture\.invalid/.test(content))throw Error('FIXTURE_IN_PRODUCTION_BUILD');}}}
await scan(directory);if(!files)throw Error('EMPTY_PRODUCTION_BUILD');console.log(`Production artifact scan passed (${files} files); this does not certify live acceptance.`);
