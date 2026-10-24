import assert from 'node:assert/strict';
import {test,before,after} from 'node:test';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {resources} from '../apps/web/src/i18n/resources.js';
import {localeCodes,direction} from '../apps/web/src/i18n/locales.js';
// Use the existing Playwright installation; no runtime app/test dependency is downloaded.
const modulePath=process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH;
const {chromium}=await import(modulePath?pathToFileURL(modulePath).href:'playwright');
const base=process.env.VINLOOK_UI_TEST_ORIGIN??'http://127.0.0.1:5173';
assert.match(base,/^http:\/\/127\.0\.0\.1:[0-9]+$/);
let browser;before(async()=>{const channel=process.env.VINLOOK_UI_BROWSER_CHANNEL;if(channel&&!['chrome','msedge'].includes(channel))throw Error('INVALID_TEST_BROWSER_CHANNEL');browser=await chromium.launch({headless:true,...(channel?{channel}:{})});});after(async()=>{await browser?.close();});
async function page(fixture=false){const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage();await p.goto(base+(fixture?'/test/locale-fixture.html':'/'));await p.locator('#tourist-language').waitFor();return {p,context};}
test('all sixteen rendered locales update exact text, document language and direction without resource HTTP calls',async()=>{
 const {p,context}=await page();const translations=[];p.on('request',r=>{if(/\/resources\/.+\.json/.test(r.url()))translations.push(r.url());});
 try{for(const code of localeCodes){await p.locator('#tourist-language').selectOption(code);await p.waitForFunction(c=>document.documentElement.lang===c,code);assert.equal(await p.locator('h1').textContent(),resources[code].translation.preview.title);assert.equal(await p.locator('html').getAttribute('dir'),direction(code));}assert.deepEqual(translations,[]);}finally{await context.close();}
});
test('browser offline switch stops non-English subscriber once; reconnect remains English until explicit selection',async()=>{
 const {p,context}=await page(true);try{
  await p.locator('#tourist-language').selectOption('ja');await context.setOffline(true);await p.waitForFunction(()=>document.documentElement.lang==='en');
  assert.equal(await p.locator('#tourist-language').inputValue(),'en');assert.equal(await p.locator('option:not([value="en"]):disabled').count(),15);assert.equal(await p.evaluate(()=>window.localeFixture.audioStopped()),1);assert.ok(await p.locator('#offline-notice').isVisible());
  await context.setOffline(false);await p.locator('#reconnect-notice').waitFor();assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.equal(await p.evaluate(()=>window.localeFixture.audioStopped()),1);await p.locator('#tourist-language').selectOption('fr');await p.waitForFunction(()=>document.documentElement.lang==='fr');assert.equal(await p.locator('#reconnect-notice').count(),0);
 }finally{await context.close();}
});
test('coordinator can force offline despite online browser hint; staff and geographic fixture remain English/LTR',async()=>{
 const {p,context}=await page(true);try{
  for(const code of ['ar','ar-EG','ur']){await p.locator('#tourist-language').selectOption(code);await p.waitForFunction(c=>document.documentElement.lang===c,code);assert.equal(await p.locator('[data-testid="staff"]').textContent(),'Try again / Try again');assert.equal(await p.locator('[data-testid="staff"]').evaluate(e=>getComputedStyle(e).direction),'ltr');
   assert.deepEqual(await p.locator('[data-testid="geometry"] svg path').evaluate(e=>({path:e.getAttribute('d'),transform:getComputedStyle(e).transform,dir:getComputedStyle(e).direction})),{path:'M10 60 L170 20',transform:'none',dir:'ltr'});assert.equal(await p.locator('[data-testid="mixed"] bdi').first().getAttribute('lang'),'vi');}
  assert.equal(await p.evaluate(()=>navigator.onLine),true);await p.evaluate(()=>window.localeFixture.setConnectivity('offline'));await p.waitForFunction(()=>document.documentElement.lang==='en');assert.equal(await p.locator('html').getAttribute('dir'),'ltr');
 }finally{await context.close();}
});
test('mobile/RTL layout, keyboard selection, zoom and one polite live region have no horizontal overflow',async()=>{
 const {p,context}=await page();try{
  await p.keyboard.press('Tab');assert.equal(await p.locator('#tourist-language').evaluate(e=>document.activeElement===e),true);assert.equal(await p.locator('label').getAttribute('for'),'tourist-language');assert.equal(await p.locator('[role="status"][aria-live="polite"]').count(),1);
  for(const width of [320,390,768]){await p.setViewportSize({width,height:900});for(const code of ['ar','ur','bn','de','zh-Hant']){await p.locator('#tourist-language').selectOption(code);await p.waitForFunction(c=>document.documentElement.lang===c,code);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}}
  await p.setViewportSize({width:390,height:844});await p.locator('#tourist-language').selectOption('ar');await p.evaluate(()=>document.documentElement.style.fontSize='200%');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.evaluate(()=>document.documentElement.style.fontSize='');
  await mkdir(new URL('../.bootstrap-review/',import.meta.url),{recursive:true});await p.screenshot({path:new URL('../.bootstrap-review/task020-ar-mobile.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
 }finally{await context.close();}
});
test('language selection is independent across tabs and starts English after refresh',async()=>{
 const {p,context}=await page();try{await p.locator('#tourist-language').selectOption('vi');const other=await context.newPage();await other.goto(base);await other.locator('#tourist-language').waitFor();assert.equal(await other.locator('#tourist-language').inputValue(),'en');assert.equal(await p.locator('#tourist-language').inputValue(),'vi');await p.reload();await p.locator('#tourist-language').waitFor();assert.equal(await p.locator('#tourist-language').inputValue(),'en');}finally{await context.close();}
});
