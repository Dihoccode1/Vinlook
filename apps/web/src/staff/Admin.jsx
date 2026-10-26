import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {createAdminAdapter} from '../adapters/admin.js';
import {createAdminState,publicationGaps} from './admin-state.js';
import {localeCodes} from '../i18n/locales.js';
import './staff.css';

function runtime(){
  try{return createAdminAdapter({identityOrigin:import.meta.env.VITE_IDENTITY_ORIGIN,contentOrigin:import.meta.env.VITE_CONTENT_ORIGIN});}
  catch{return null;}
}
const initial={nameEN:'',sourceTextEN:'',location:{type:'Point',coordinates:[0,0]},entrance:null,thumbnailAsset:null};
export function Admin({api:provided}){
  const api=useMemo(()=>provided??runtime(),[provided]);
  return <div className="staff" lang="en" dir="ltr">{api?<Editor api={api}/>:<main><h1>Vinlook Staff</h1><p role="alert">Service origins are not configured. Contact the operator.</p></main>}</div>;
}
function Editor({api}){
  const store=useMemo(()=>createAdminState(api),[api]);
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot);
  const [poiId,setPoiId]=useState(''),[code,setCode]=useState('en'),[text,setText]=useState(''),[reason,setReason]=useState('');
  const [key,setKey]=useState(null),[dirty,setDirty]=useState(false),[upload,setUpload]=useState(null);
  const [intent,setIntent]=useState(null);
  const doc=state.document,rev=doc?.workingRevision,rows=doc?.localizedContents??[],row=rows.find(r=>r.languageCode===code);
  const principal=state.principal,canWrite=Boolean(principal?.currentWorkSession)&&!state.busy&&!state.conflict;
  const editable=canWrite&&(!doc||rev?.status==='draft');
  const manager=principal?.account?.role==='Manager',gaps=publicationGaps(doc);
  const run=async fn=>{try{await fn();}catch{/* centralized safe error in store */}};
  const change=(field,value)=>{setDirty('metadata');setKey(null);store.setInput({...state.input,[field]:value});};
  useEffect(()=>{setText(row?.text??'');},[row?.text,code]);
  useEffect(()=>{const leave=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[dirty]);
  const load=()=>{if(dirty&&!window.confirm('Discard unsaved input and load the server version?'))return;void run(async()=>{await store.read(poiId);setDirty(false);setKey(null);setUpload(null);});};
  const mutate=(fn,{idempotent=false}={})=>run(async()=>{const attemptKey=idempotent?(key??crypto.randomUUID()):null;if(attemptKey)setKey(attemptKey);await store.mutate((adapter,s)=>fn(adapter,s,attemptKey));setKey(null);setDirty(false);});
  if(!principal)return <main><h1>Vinlook Staff</h1><p>Sign in with an existing approved account. Tokens stay in this tab only.</p>
    <form onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);const password=String(fields.get('password'));e.currentTarget.reset();void run(()=>store.login(String(fields.get('email')),password));}}>
      <label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
      <button disabled={state.busy}>Sign in</button></form>{state.error&&<p role="alert">{state.error}</p>}</main>;
  const input=state.input??initial;
  return <main><header><h1>Vinlook Staff</h1><p>{principal.account.fullName} · {principal.account.role} · Session: {principal.currentWorkSession?'Open':'Closed'}</p><button onClick={()=>{if(!dirty||window.confirm('Discard unsaved input and sign out?')){store.logout();setDirty(false);}}}>Sign out</button></header>
    <section aria-label="Work session"><button disabled={state.busy} onClick={()=>void run(()=>store.session('open'))}>Open / reopen session</button>
      <label>Close / return / review reason<input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label>
      <button disabled={!canWrite||!reason.trim()} onClick={()=>void run(()=>store.session('close',reason))}>Close session</button></section>
    {state.error&&<p role="alert">{state.error}{state.conflict?' — Your input is preserved. Load the server version explicitly before retrying.':''}</p>}
    {state.busy&&<p role="status">Working…</p>}
    <section aria-label="Open POI"><label>POI ID<input value={poiId} onChange={e=>setPoiId(e.target.value)}/></label><button disabled={state.busy} onClick={load}>Load POI</button>
      <button disabled={!canWrite} onClick={()=>{if(!dirty||window.confirm('Discard unsaved input?')){store.newDraft({...initial});setDirty('metadata');setKey(null);}}}>New draft input</button></section>
    {doc&&<p>POI {doc.poi.id} · working {rev?.status??'none'} · editVersion {rev?.editVersion??'—'} · published {doc.publishedRevision?.id??'none'}</p>}
    {doc&&!rev&&<button disabled={!canWrite} onClick={()=>void mutate((a,s,k)=>a.clone(s.document.poi.id,s.document.publishedRevision.id,k),{idempotent:true})}>Create draft from published</button>}
    <section aria-label="Draft editor"><h2>Draft</h2><label>Name (English)<input disabled={!editable||dirty==='locale'} value={input.nameEN??''} onChange={e=>change('nameEN',e.target.value)}/></label>
      <label>English source<textarea disabled={!editable||dirty==='locale'} value={input.sourceTextEN??''} onChange={e=>change('sourceTextEN',e.target.value)}/></label>
      {['location','entrance'].map(field=><fieldset key={field} disabled={!editable||dirty==='locale'}><legend>{field==='location'?'Marker':'Entrance'} · longitude, latitude</legend>{[0,1].map(index=><input key={index} aria-label={`${field} ${index===0?'longitude':'latitude'}`} type="number" step="any" min={index===0?-180:-90} max={index===0?180:90} value={input[field]?.coordinates[index]??''} onChange={e=>{const coordinates=[...(input[field]?.coordinates??[0,0])];coordinates[index]=Number(e.target.value);change(field,{type:'Point',coordinates});}}/>)}</fieldset>)}
      <button disabled={!editable||dirty==='locale'||!input.nameEN?.trim()||!input.sourceTextEN?.trim()} onClick={()=>void mutate((a,s,k)=>{const changes={nameEN:input.nameEN,sourceTextEN:input.sourceTextEN,location:input.location,entrance:input.entrance,thumbnailAsset:input.thumbnailAsset};return rev?a.save(rev.id,rev.editVersion,changes):a.create(changes,k);},{idempotent:!rev})}>{rev?'Save draft':'Create POI'}</button>
      <label>Thumbnail (max 2 MiB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!editable||dirty||!rev} onChange={e=>{setUpload(e.target.files?.[0]??null);setIntent(null);}}/></label>
      <button disabled={!editable||dirty||!rev||!upload||Boolean(intent)} onClick={()=>void mutate(async(a,s)=>{const current=s.document.workingRevision;const pending=await a.thumbnailIntent(current.id,current.editVersion);setIntent({...pending,revisionId:current.id});const result=await a.upload(pending.intentId,upload);setIntent({...result,revisionId:current.id});if(result.status!=='verified')throw Object.assign(Error(),{code:'MEDIA_VERIFICATION_UNAVAILABLE'});return a.save(current.id,current.editVersion,{thumbnailAsset:result.asset});})}>Upload and attach thumbnail</button>
      {intent&&intent.revisionId===rev?.id&&<section aria-label="Upload recovery"><p>Upload {intent.intentId??intent.id} · {intent.status} — uncertain uploads are not automatically resent.</p>
        <button disabled={state.busy} onClick={()=>void run(()=>store.inspect(async a=>{const result=await a.mediaStatus(intent.intentId??intent.id);setIntent({...result,revisionId:rev.id});}))}>Check upload status</button>
        <button disabled={!editable||dirty} onClick={()=>void mutate(async a=>{const result=await a.reconcile(intent.intentId??intent.id);setIntent({...result,revisionId:rev.id});return {poiId:doc.poi.id};})}>Reconcile existing upload</button>
        <button disabled={!editable||dirty||intent.status!=='verified'||!intent.asset} onClick={()=>void mutate(a=>a.save(rev.id,rev.editVersion,{thumbnailAsset:intent.asset}))}>Attach verified thumbnail</button>
      </section>}
    </section>
    {rev&&<><section aria-label="Language review"><h2>Languages</h2><label>Exact locale<select disabled={Boolean(dirty)} value={code} onChange={e=>{setCode(e.target.value);setKey(null);}}>{localeCodes.map(value=><option key={value}>{value}</option>)}</select></label>
      <p>{code} · textVersion {row?.textVersion??'missing'} · source {String(row?.isSourceCurrent??false)} · audio {String(row?.isAudioCurrent??false)} · {row?.reviewStatus??'missing'}</p>
      <textarea aria-label="Locale text" value={text} disabled={!editable||code==='en'||dirty==='metadata'} onChange={e=>{setText(e.target.value);setDirty('locale');setKey(null);}}/>
      {row?.audioAsset?.url&&<audio key={`${code}:${row.audioAsset.url}`} controls preload="none" src={row.audioAsset.url}/>}
      <button disabled={!editable||code==='en'||dirty==='metadata'||!text.trim()} onClick={()=>void mutate(a=>a.saveLocale(rev.id,code,rev.editVersion,text))}>Save locale text</button>
      <button disabled={!canWrite||dirty||!row} onClick={()=>void mutate(a=>a.review(rev.id,code,{expectedEditVersion:rev.editVersion,expectedTextVersion:row.textVersion,decision:'approved'}))}>Approve exact locale</button>
      <button disabled={!canWrite||dirty||!row||!reason.trim()} onClick={()=>void mutate(a=>a.review(rev.id,code,{expectedEditVersion:rev.editVersion,expectedTextVersion:row.textVersion,decision:'changes_required',reason}))}>Request changes</button>
      <button disabled={!editable||dirty} onClick={()=>{if(window.confirm(`Queue processing for ${code}? This may consume free provider quota.`))void mutate((a,s,k)=>a.process(rev.id,rev.editVersion,[code],k),{idempotent:true});}}>Process selected locale</button>
    </section>
    <section aria-label="Jobs"><h2>Jobs</h2><button disabled={state.busy} onClick={()=>void run(()=>store.jobs())}>Refresh jobs</button>{state.jobs.map(job=><article key={job.id}><p>{job.languageCode} · {job.taskType} · {job.status??'unknown'} · {job.safeErrorCode??job.errorCode??'—'}</p><button disabled={!canWrite||dirty||!['failed','waiting_quota'].includes(job.status)} onClick={()=>{if(window.confirm('Retry this job? A provider call may occur. Unknown outcomes require separate operator review.'))void mutate((a,s,k)=>a.retry(job.id,rev.editVersion,k),{idempotent:true});}}>Retry job</button></article>)}</section>
    <section aria-label="Publication"><h2>Publication</h2><button disabled={!editable||dirty} onClick={()=>void mutate(a=>a.submit(rev.id,rev.editVersion))}>Submit for review</button>
      {manager&&<><button disabled={!canWrite||dirty||rev.status!=='in_review'||!reason.trim()} onClick={()=>void mutate(a=>a.returnDraft(rev.id,rev.editVersion,reason))}>Return to draft</button><ul>{gaps.map(gap=><li key={gap}>{gap}</li>)}</ul>
      <button disabled={!canWrite||dirty||gaps.length>0} onClick={()=>{if(window.confirm('Confirm geography/entrance and publish this exact version after reviewing all 16 locales?'))void mutate((a,s,k)=>a.publish(rev.id,{expectedEditVersion:rev.editVersion,expectedPublishedRevisionId:doc.publishedRevision?.id??null,confirmGeography:true},k),{idempotent:true});}}>Publish</button></>}
    </section></>}
  </main>;
}
