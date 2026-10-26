import {test} from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH).href);
const base=process.env.VINLOOK_UI_TEST_ORIGIN??'http://127.0.0.1:5174';assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);

test('offline panel shows verified progress, rechecks native storage on reload and rejects corrupt metadata',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.goto(base+'/test/offline-panel-fixture.html');const prepare=page.getByRole('button',{name:'Prepare offline guide',exact:true});await prepare.waitFor();await page.waitForFunction(()=>!document.querySelector('button').disabled);await prepare.click();
    await page.getByRole('progressbar').waitFor();assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0');
    await page.waitForFunction(()=>typeof window.offlinePanelFixture.release==='function');await page.evaluate(()=>window.offlinePanelFixture.release());
    await page.getByRole('status').filter({hasText:'Offline guide ready'}).waitFor();assert.equal(await prepare.isDisabled(),true);
    await page.reload();await page.getByRole('status').filter({hasText:'Offline guide ready'}).waitFor();assert.equal(await page.getByRole('button',{name:'Prepare offline guide',exact:true}).isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.evaluate(()=>window.offlinePanelFixture.storage.activate({packageVersion:'fixture-panel-v1',files:[]}));await page.reload();
    await page.getByRole('alert').filter({hasText:'LOCAL_DATA_MISSING'}).waitFor();assert.equal(await page.getByRole('status').innerText(),'Download failed.');
    await page.screenshot({path:'.bootstrap-review/issue79-offline-invalid-mobile.png',fullPage:true});
  }finally{await browser.close();}
});
test('native IndexedDB activation survives close/reopen; failed candidate preserves active; no service worker installed',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
  try{await page.goto(base+'/test/offline-fixture.html');await page.waitForFunction(()=>Boolean(window.offlineFixture));
    const result=await page.evaluate(async()=>{
      const {openOfflineStorage,createPackageStore,sha256}=window.offlineFixture;let storage=await openOfflineStorage();
      const bytes=new TextEncoder().encode('LABELLED NATIVE STORAGE FIXTURE').buffer;
      const descriptor={packageVersion:'fixture-native-v1',files:[{id:'fixture-shell',byteLength:bytes.byteLength,sha256:await sha256(bytes)}]};
      const shell={prepare:async()=>{},markReady:async v=>(await caches.open('fixture-'+v)).put('/fixture-ready',new Response(v)),isReady:async v=>Boolean(await(await caches.open('fixture-'+v)).match('/fixture-ready'))};
      const store=createPackageStore({storage,shell,manifestAdapter:async d=>d,fetchFile:async()=>bytes});await store.download(descriptor);storage.close();
      storage=await openOfflineStorage();const reopened=createPackageStore({storage,shell,manifestAdapter:async d=>d,fetchFile:async()=>{throw Error('network');}});
      const before=await reopened.reopen();try{await reopened.download({...descriptor,packageVersion:'fixture-native-v2'});}catch{}
      const active=await storage.active();storage.close();return {before:before.status,active:active.packageVersion,registrations:(await navigator.serviceWorker.getRegistrations()).length};
    });assert.deepEqual(result,{before:'ready',active:'fixture-native-v1',registrations:0});
  }finally{await browser.close();}
});
