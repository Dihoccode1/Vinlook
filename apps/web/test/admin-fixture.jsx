import React from 'react';
import {createRoot} from 'react-dom/client';
import {Admin} from '../src/staff/Admin.jsx';
import {createAdminAdapter} from '../src/adapters/admin.js';
if(!import.meta.env.DEV)throw Error('FIXTURE_FORBIDDEN');
const poi='000000000000000000000001',rev='000000000000000000000002';
let session=null,fixtureDocument=null,version=0;
const role=new URL(location.href).searchParams.get('role')==='Manager'?'Manager':'Staff';
const calls=[];
window.adminFixture={calls,conflict:false};
const api=createAdminAdapter({identityOrigin:'https://identity.fixture.invalid',contentOrigin:'https://content.fixture.invalid'},{fetcher:async(url,init)=>{
  calls.push({path:url.pathname,method:init.method});const body=typeof init.body==='string'?JSON.parse(init.body):{};
  const ok=data=>new Response(JSON.stringify({data,requestId:'admin-fixture'}));
  if(url.pathname.endsWith('/auth/login'))return ok({accessToken:'SYNTHETIC-TEST-TOKEN'});
  if(url.pathname.endsWith('/me'))return ok({account:{id:poi,role,status:'active',fullName:'Labelled fixture'},currentWorkSession:session});
  if(url.pathname.endsWith('/open')){session={id:poi,status:'open'};return ok({session});}
  if(url.pathname.endsWith('/close')){session=null;return ok({session:{id:poi,status:'closed'}});}
  if(init.method==='PATCH'){
    if(window.adminFixture.conflict)return new Response(JSON.stringify({error:{code:'EDIT_VERSION_CONFLICT',requestId:'fixture'}}),{status:409});
    if(body.expectedEditVersion!==version)throw Error('fixture version mismatch');version++;fixtureDocument.workingRevision={...fixtureDocument.workingRevision,...body.changes,editVersion:version};return ok({poiId:poi,revisionId:rev,editVersion:version});
  }
  if(url.pathname.endsWith('/admin/pois')&&init.method==='POST'){fixtureDocument={poi:{id:poi},workingRevision:{...body,id:rev,editVersion:version,status:'draft'},publishedRevision:null,localizedContents:[]};return ok({poiId:poi,revisionId:rev,editVersion:version});}
  if(url.pathname.endsWith(`/admin/pois/${poi}`))return ok(structuredClone(fixtureDocument));
  if(url.pathname.endsWith('/admin/jobs'))return ok({items:[]});
  if(url.pathname.endsWith('/admin/jobs/run-next'))return ok({jobId:rev,attemptId:poi});
  throw Error('Unexpected fixture operation');
}});
createRoot(document.getElementById('root')).render(<><aside style={{background:'#fff1bd',padding:16}}><strong>LOCAL ADMIN FIXTURE — NOT LIVE ACCEPTANCE</strong><p>Transport and persistence are synthetic. No provider, database or real account.</p></aside><Admin api={api}/></>);
