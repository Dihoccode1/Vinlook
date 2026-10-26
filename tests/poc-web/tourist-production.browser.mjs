// Real App entry, intercepted synthetic public HTTP/media only. Not live acceptance.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(pathToFileURL(process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH).href);
const base=process.env.VINLOOK_UI_TEST_ORIGIN??'http://127.0.0.1:5176';let browser;
before(async()=>{browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});});after(async()=>browser?.close());
const dto=(i,locale)=>({id:i.toString(16).padStart(24,'0'),revisionId:(i+100).toString(16).padStart(24,'0'),nameEN:`Test public place ${String(i).padStart(2,'0')}`,location:{type:'Point',coordinates:[106.7+i/500,10.77]},entrance:{type:'Point',coordinates:[106.7+i/500,10.77]},thumbnail:{url:'https://fixture.invalid/image.png'},languageCode:locale,text:`[SYNTHETIC TEST ONLY · ${locale}] Narration`,audio:{url:`https://fixture.invalid/${i}/${locale}.mp3`,durationSeconds:120}});
async function setup({scenario='ready',gps='denied'}={}){
 const context=await browser.newContext({viewport:{width:390,height:844}}),state={scenario,requests:[]};
 await context.addInitScript(({gps})=>{window.__testPlays=0;HTMLMediaElement.prototype.play=function(){window.__testPlays++;window.__testMedia=this;return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){};HTMLMediaElement.prototype.load=function(){};
 navigator.geolocation.getCurrentPosition=gps==='denied'?(_ok,error)=>error({code:1}):ok=>ok({coords:{longitude:106.7,latitude:10.77}});},{gps});
 await context.route('**/api/v1/**',async route=>{const u=new URL(route.request().url());state.requests.push(u);const locale=u.searchParams.get('language')??'en';
  if(state.scenario==='slow'){await new Promise(r=>setTimeout(r,200));}
  if(state.scenario==='error'){await route.fulfill({status:503,json:{error:{code:'PUBLIC_CONTENT_UNAVAILABLE',requestId:'test'}}});return;}
  const items=state.scenario==='empty'?[]:Array.from({length:15},(_,i)=>dto(i+1,locale));let data;
  if(u.pathname.endsWith('/nearby'))data={items:items.slice(0,2).map((x,i)=>({...x,straightLineDistanceMeters:100*(i+1)})),actualCount:Math.min(2,items.length),radiusMeters:3000};
  else if(/\/pois\/[a-f0-9]{24}$/.test(u.pathname))data=dto(parseInt(u.pathname.split('/').at(-1),16),locale);
  else data={items:items.filter(x=>x.nameEN.toLowerCase().includes((u.searchParams.get('q')??'').toLowerCase())),snapshotId:'test-snapshot',nextCursor:null};
  await route.fulfill({json:{data,requestId:'test'}});
 });
 await context.route('**/style.json',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'test-background',type:'background',paint:{'background-color':'#e6eddf'}}]}}));
 await context.route('https://fixture.invalid/**',r=>r.fulfill({status:404,body:'test asset unavailable'}));
 const page=await context.newPage();page.on('console',m=>{if(m.type()==='error'&&process.env.DEBUG_TOURIST_TEST)console.log(m.text().slice(0,600));});await page.goto(base);return{context,page,state};
}
test('actual tourist entry renders public list, native map markers, search, POI and player without autoplay',async()=>{
 const {context,page,state}=await setup();try{
  await page.getByRole('button',{name:'View place: Test public place 01',exact:true}).first().waitFor();
  await page.locator('.tour-map[data-ready="true"]').waitFor();await page.locator('.poi-pin').first().waitFor();assert.equal(await page.locator('.poi-pin').count(),15);
  const mapBox=await page.locator('.tour-map-canvas').boundingBox(),pinBox=await page.locator('.poi-pin').first().boundingBox();assert.ok(mapBox.height>200&&mapBox.width>200);assert.ok(pinBox.x>=mapBox.x&&pinBox.x<mapBox.x+mapBox.width&&pinBox.y>=mapBox.y&&pinBox.y<mapBox.y+mapBox.height);
  assert.equal(await page.evaluate(()=>window.__testPlays),0);
  await page.locator('.tour-place').first().click();await page.locator('.poi-detail h2').waitFor();assert.equal(await page.evaluate(()=>window.__testPlays),0);
  await page.locator('.listen-button').click();await page.getByRole('button',{name:'Pause',exact:true}).waitFor();
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.locator('.mini-play').click();assert.equal(await page.evaluate(()=>window.__testPlays),2);
  await page.locator('#tourist-language').selectOption('vi');await page.waitForFunction(()=>!document.querySelector('.tour-mini-player'));await page.getByRole('button',{name:'Xem địa điểm: Test public place 01',exact:true}).first().waitFor();
  await page.getByRole('textbox',{name:'Tìm địa điểm'}).fill('place 15');await page.waitForFunction(()=>document.querySelectorAll('.tour-place').length===1);
  assert.equal(await page.locator('.tour-place strong').textContent(),'Test public place 15');assert.ok(state.requests.every(u=>!u.pathname.includes('/admin/')));
 }finally{await context.close();}
});
test('GPS denial leaves catalog usable; nearby uses public 3km/max4 response with actual two results',async()=>{
 const denied=await setup();try{await denied.page.locator('.tour-place').first().waitFor();await denied.page.locator('.locate-control').click();await denied.page.getByText('Location permission was denied.',{exact:true}).waitFor();assert.equal(await denied.page.locator('.tour-place').count(),15);}finally{await denied.context.close();}
 const allowed=await setup({gps:'allowed'});try{await allowed.page.locator('.tour-place').first().waitFor();await allowed.page.locator('.locate-control').click();await allowed.page.waitForFunction(()=>document.querySelectorAll('.tour-place').length===2);assert.ok(allowed.state.requests.some(u=>u.pathname.endsWith('/nearby')&&u.searchParams.get('limit')==='4'));}finally{await allowed.context.close();}
});
test('empty/error/retry, all16 locale responses, RTL layout and mobile/laptop screenshots use production components',async()=>{
 const {context,page,state}=await setup({scenario:'empty'});try{
  await page.getByText('No published places yet',{exact:true}).waitFor();state.scenario='error';await page.getByRole('textbox',{name:'Search places'}).fill('x');await page.getByText('The guide could not connect.',{exact:true}).waitFor();
  state.scenario='ready';await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('No published places yet',{exact:true}).waitFor();await page.getByRole('textbox',{name:'Search places'}).fill('');await page.locator('.tour-place').first().waitFor();
  const codes=await page.locator('#tourist-language option').evaluateAll(xs=>xs.map(x=>x.value));assert.equal(codes.length,16);
  for(const code of codes){await page.locator('#tourist-language').selectOption(code);await page.waitForFunction(code=>document.documentElement.lang===code&&document.querySelector('.tour-place-list')?.dataset.contentLocale===code,code);assert.equal(await page.locator('.tour-place').count(),15);}
  await page.locator('#tourist-language').selectOption('ar');await page.waitForFunction(()=>document.documentElement.dir==='rtl');
  for(const width of [390,1280]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.locator('#tourist-language').selectOption('en');await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('.tour-place-list')?.dataset.contentLocale==='en');await page.locator('.tour-map[data-ready="true"]').waitFor();await page.locator('.poi-pin').first().waitFor({state:'visible'});await mkdir('.bootstrap-review',{recursive:true});
  for(const width of [390,1280]){await page.setViewportSize({width,height:844});await page.screenshot({path:`.bootstrap-review/issue76-app-test-${width}.png`,fullPage:true});}
 }finally{await context.close();}
});
