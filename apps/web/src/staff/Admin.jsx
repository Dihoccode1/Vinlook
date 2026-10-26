import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {createAdminAdapter} from '../adapters/admin.js';
import {createAdminState,publicationGaps} from './admin-state.js';
import {localeCodes} from '../i18n/locales.js';
import './staff.css';
import {Monitor} from './monitor/Monitor.jsx';

function runtime(){
  try{return createAdminAdapter({identityOrigin:import.meta.env.VITE_IDENTITY_ORIGIN,contentOrigin:import.meta.env.VITE_CONTENT_ORIGIN,usageOrigin:import.meta.env.VITE_USAGE_ORIGIN});}
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
  const [dispatch,setDispatch]=useState(null);
  const [view,setView]=useState('content');
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
  if(!principal)return <main className="staff-login"><a className="staff-brand" href="/">VINLOOK <span>Content studio</span></a><div className="staff-intro"><p className="staff-eyebrow">FOR STAFF & MANAGERS</p><h1>Bring the city’s stories to life.</h1><p>Create places, prepare narration and review every language before publishing.</p></div><h2>Vinlook Staff</h2><p>Sign in with an existing approved account. Tokens stay in this tab only.</p>
    <form onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);const password=String(fields.get('password'));e.currentTarget.reset();void run(()=>store.login(String(fields.get('email')),password));}}>
      <label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
      <button disabled={state.busy}>Sign in</button></form>{state.error&&<p role="alert">{state.error}</p>}</main>;
  const input=state.input??initial;
  if(view==='monitor')return <><nav className="staff-monitor-nav" aria-label="Staff workspace"><button onClick={()=>setView('content')}>Back to content</button><button onClick={()=>{if(!dirty||window.confirm('Discard unsaved input and sign out?')){store.logout();setView('content');setDirty(false);setDispatch(null);setIntent(null);setUpload(null);}}}>Sign out</button></nav><Monitor api={api.monitor} onUnauthorized={()=>{store.logout();setView('content');setDirty(false);setDispatch(null);setIntent(null);setUpload(null);}}/></>;
  return <main><header className="staff-header"><div><p className="staff-eyebrow">VINLOOK / CONTENT STUDIO</p><h1>Vinlook Staff</h1><p>{principal.account.fullName} · {principal.account.role}</p></div><div className="staff-account"><span className={`staff-badge ${principal.currentWorkSession?'is-open':''}`}>Session: {principal.currentWorkSession?'Open':'Closed'}</span><button className="staff-secondary" onClick={()=>{if(!dirty||window.confirm('Discard unsaved input and sign out?')){store.logout();setDirty(false);setDispatch(null);setIntent(null);setUpload(null);}}}>Sign out</button></div></header>
    <nav className="staff-nav" aria-label="Content workflow"><a href="#work-session">01 Session</a><a href="#open-poi">02 Open place</a><a href="#draft-editor">03 Draft</a>{rev&&<><a href="#language-review">04 Languages</a><a href="#processing-jobs">05 Jobs</a><a href="#publication">06 Publish</a></>}<button className="staff-secondary" disabled={state.busy} onClick={()=>setView('monitor')}>Monitoring</button></nav>
    {dirty&&<p className="staff-notice" role="status">Unsaved {dirty==='locale'?'language text':'draft details'} — save before moving to another step.</p>}
    <section id="work-session" aria-label="Work session"><div><p className="staff-eyebrow">01 / START YOUR DAY</p><h2>Work session</h2><p>Open today’s session to edit content. Closing it keeps your work and records the reason.</p></div><button disabled={state.busy} onClick={()=>void run(()=>store.session('open'))}>Open / reopen session</button>
      <label>Close / return / review reason<input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label>
      <button disabled={!canWrite||!reason.trim()} onClick={()=>void run(()=>store.session('close',reason))}>Close session</button></section>
    {state.error&&<p role="alert">{state.error}{state.conflict?' — Your input is preserved. Load the server version explicitly before retrying.':''}</p>}
    {state.busy&&<p role="status">Working…</p>}
    <section id="open-poi" aria-label="Open POI"><div><p className="staff-eyebrow">02 / CHOOSE A PLACE</p><h2>Open a place</h2><p>Paste an existing POI ID to load its current revision, or start a new draft below.</p></div><label>POI ID<input value={poiId} onChange={e=>setPoiId(e.target.value)} placeholder="24-character POI ID" spellCheck={false}/></label><button disabled={state.busy||!/^[a-f0-9]{24}$/.test(poiId)} onClick={load}>Load POI</button>
      <button disabled={!canWrite} onClick={()=>{if(!dirty||window.confirm('Discard unsaved input?')){store.newDraft({...initial});setDirty('metadata');setKey(null);}}}>New draft input</button></section>
    {doc&&<aside className="staff-context" aria-label="Loaded revision"><strong>{rev?.nameEN??doc.publishedRevision?.nameEN??'Loaded place'}</strong><p>POI {doc.poi.id} · working {rev?.status??'none'} · editVersion {rev?.editVersion??'—'} · published {doc.publishedRevision?.id??'none'}</p><p>Changes stay in the working revision until a Manager publishes them.</p></aside>}
    {doc&&!rev&&<button disabled={!canWrite} onClick={()=>void mutate((a,s,k)=>a.clone(s.document.poi.id,s.document.publishedRevision.id,k),{idempotent:true})}>Create draft from published</button>}
    <section id="draft-editor" aria-label="Draft editor"><p className="staff-eyebrow">03 / PLACE DETAILS</p><h2>Draft</h2><label>Name (English)<input disabled={!editable||dirty==='locale'} value={input.nameEN??''} onChange={e=>change('nameEN',e.target.value)}/></label>
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
    {rev&&<><section id="language-review" aria-label="Language review"><p className="staff-eyebrow">04 / NARRATION & REVIEW</p><h2>Languages</h2><p>Read the text and listen to the complete current audio before approving each language. English source is edited in Draft.</p><label>Exact locale<select disabled={Boolean(dirty)||state.busy} value={code} onChange={e=>{setCode(e.target.value);setKey(null);}}>{localeCodes.map(value=><option key={value}>{value}</option>)}</select></label>
      <p>{code} · textVersion {row?.textVersion??'missing'} · source {String(row?.isSourceCurrent??false)} · audio {String(row?.isAudioCurrent??false)} · {row?.reviewStatus??'missing'}</p>
      <textarea aria-label="Locale text" value={text} disabled={!editable||code==='en'||dirty==='metadata'} onChange={e=>{setText(e.target.value);setDirty('locale');setKey(null);}}/>
      {row?.audioAsset?.url&&<div className="staff-audio"><p>Current audio · {code} · textVersion {row.textVersion} · {row.durationSeconds??'Unknown'} seconds</p><audio aria-label={`Current ${code} narration`} key={`${code}:${row.audioAsset.url}`} controls preload="none" src={row.audioAsset.url}/></div>}
      <button disabled={!editable||code==='en'||dirty==='metadata'||!text.trim()} onClick={()=>void mutate(a=>a.saveLocale(rev.id,code,rev.editVersion,text))}>Save locale text</button>
      <button disabled={!canWrite||dirty||!row||!row.isSourceCurrent||!row.isAudioCurrent||!row.audioAsset?.url} onClick={()=>{if(window.confirm(`Confirm you reviewed the text and listened to the complete ${code} audio (${row.durationSeconds??'unknown'} seconds), textVersion ${row.textVersion}, editVersion ${rev.editVersion}?`))void mutate(a=>a.review(rev.id,code,{expectedEditVersion:rev.editVersion,expectedTextVersion:row.textVersion,decision:'approved'}));}}>Approve exact locale</button>
      <button disabled={!canWrite||dirty||!row||!reason.trim()} onClick={()=>void mutate(a=>a.review(rev.id,code,{expectedEditVersion:rev.editVersion,expectedTextVersion:row.textVersion,decision:'changes_required',reason}))}>Request changes</button>
      <button disabled={!editable||dirty} onClick={()=>{if(window.confirm(`Queue processing for ${code}? This may consume free provider quota.`))void mutate((a,s,k)=>a.process(rev.id,rev.editVersion,[code],k),{idempotent:true});}}>Process selected locale</button>
    </section>
    <section id="processing-jobs" aria-label="Jobs"><p className="staff-eyebrow">05 / PROCESSING</p><h2>Jobs</h2><p>Processing queues work. Gemini jobs need an explicit dispatch; MMS audio needs the local worker. Refresh to read the current server state.</p>
      <button disabled={!canWrite||dirty} onClick={()=>{if(window.confirm('Dispatch the next eligible Gemini job across the entire system? It may belong to another POI and consume provider quota. This does not start the local MMS worker.'))void run(async()=>{const result=await store.mutate(a=>a.runNext(crypto.randomUUID()));setDispatch(result);});}}>Dispatch next system Gemini job</button>
      {dispatch&&<p role="status">Dispatch acknowledged · Job {dispatch.jobId??'none returned'}. Refresh jobs to verify completion.</p>}
      <button disabled={state.busy} onClick={()=>void run(()=>store.jobs())}>Refresh jobs</button>{state.jobs.map(job=><article key={job.id}><p>{job.languageCode} · {job.taskType} · {job.status??'unknown'} · {job.safeErrorCode??job.errorCode??job.error??'—'}</p><button disabled={!canWrite||dirty||!['failed','waiting_quota'].includes(job.status)||job.error==='PROVIDER_OUTCOME_UNKNOWN'} onClick={()=>{if(window.confirm('Retry this job? A provider call may occur. Unknown outcomes require separate operator review.'))void mutate((a,s,k)=>a.retry(job.id,rev.editVersion,k),{idempotent:true});}}>Retry job</button></article>)}</section>
    <section id="publication" aria-label="Publication"><p className="staff-eyebrow">06 / FINAL CHECK</p><h2>Publication</h2><p>All 16 languages must have current approved text and audio. A Manager makes the final publication decision.</p><button disabled={!editable||dirty} onClick={()=>void mutate(a=>a.submit(rev.id,rev.editVersion))}>Submit for review</button>
      {manager&&<><button disabled={!canWrite||dirty||rev.status!=='in_review'||!reason.trim()} onClick={()=>void mutate(a=>a.returnDraft(rev.id,rev.editVersion,reason))}>Return to draft</button><ul>{gaps.map(gap=><li key={gap}>{gap}</li>)}</ul>
      <button disabled={!canWrite||dirty||gaps.length>0} onClick={()=>{if(window.confirm('Confirm geography/entrance and publish this exact version after reviewing all 16 locales?'))void mutate((a,s,k)=>a.publish(rev.id,{expectedEditVersion:rev.editVersion,expectedPublishedRevisionId:doc.publishedRevision?.id??null,confirmGeography:true},k),{idempotent:true});}}>Publish</button></>}
    </section></>}
  </main>;
}
