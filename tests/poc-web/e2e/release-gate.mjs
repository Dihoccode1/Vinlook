import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
export const releaseChecks=Object.freeze(['public15Poi','approved240Pairs','touristMapGpsSearch','audio16NoAutoplay','walkingFullCoverage','englishOfflineReopen','atomicUpdateFailure','adminPersistRbac','realMultiBrowserMonitor','httpsExactCors','secretFreeConsole','safariDevice','loadWarmCold','backupRollback']);
// Evidence completeness check only: cannot create human approval or verify live behavior.
export function evaluateRelease(evidence,sha){
  const gaps=[];if(!evidence||evidence.fixture!==false)gaps.push('REAL_EVIDENCE_REQUIRED');
  if(!/^[a-f0-9]{40}$/.test(sha??'')||evidence?.reviewedMergedSha!==sha)gaps.push('EXACT_MERGED_SHA_REQUIRED');
  if(evidence?.approvedBy!=='Dihoccode1'||!/^https:\/\/github\.com\/Dihoccode1\/Vinlook\/(?:pull|issues)\/\d+#/.test(evidence?.approvalUrl??''))gaps.push('DUY_APPROVAL_REQUIRED');
  let origin;try{origin=new URL(evidence?.publicOrigin);if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error();}catch{gaps.push('PUBLIC_HTTPS_ORIGIN_REQUIRED');}
  for(const name of releaseChecks){const check=evidence?.checks?.[name];if(check?.status!=='PASS'||check?.fixture!==false||check?.sha!==sha||typeof check?.evidence!=='string'||!check.evidence.startsWith('https://'))gaps.push(name);}
  return {status:gaps.length?'NOT READY':'EVIDENCE COMPLETE — HUMAN RELEASE DECISION REQUIRED',gaps};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const file=process.argv[2],sha=process.argv[3];let evidence=null;if(file)evidence=JSON.parse(await readFile(file,'utf8'));
  const result=evaluateRelease(evidence,sha);console.log(JSON.stringify(result,null,2));if(result.gaps.length)process.exitCode=1;
}
