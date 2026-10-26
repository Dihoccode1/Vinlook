import {readdir} from 'node:fs/promises';import {resolve,basename} from 'node:path';import {pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';
export async function findSuites(root,kind='unit'){
  const files=[];async function visit(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=resolve(directory,entry.name);if(entry.isDirectory())await visit(path);else if(entry.isFile()&&path.endsWith('.test.mjs')&&((basename(path)==='browser.test.mjs')===(kind==='browser')))files.push(path);}}await visit(resolve(root));return files.sort();
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const kind=process.argv[2]??'unit';if(!['unit','browser'].includes(kind))throw Error('INVALID_SUITE_KIND');
  if(kind==='browser'&&!process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH)throw Error('BROWSER_TOOLING_REVIEW_PENDING');
  const files=await findSuites('tests/poc-web',kind);if(!files.length)throw Error('NO_TEST_SUITES');
  const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});if(result.error)throw result.error;process.exitCode=result.status??1;
}
