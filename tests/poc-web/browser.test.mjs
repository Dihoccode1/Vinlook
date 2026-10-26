import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const modulePath=process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH;
if(!modulePath)throw Error('VINLOOK_PLAYWRIGHT_MODULE_PATH_REQUIRED; use an existing installation, do not change repo dependencies');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.VINLOOK_UI_TEST_ORIGIN??'http://127.0.0.1:5173';
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
let browser;
before(async()=>{browser=await chromium.launch({channel:'chrome',headless:true});});
after(async()=>{await browser?.close();});
const url=base+'/test/tourist-fixture.html';
async function open(context){const page=await context.newPage();await page.goto(url);await page.getByRole('button',{name:'Fixture place 01',exact:true}).waitFor();return page;}
test('real browser two-tab first-use identity matches; independent browser context differs',async()=>{
  const a=await browser.newContext(),b=await browser.newContext();
  try{
    const [one,two,other]=await Promise.all([open(a),open(a),open(b)]);
    const [x,y,z]=await Promise.all([one,two,other].map(p=>p.evaluate(()=>window.touristFixture.identity())));
    assert.equal(x.quality,'shared');assert.equal(x.browserId,y.browserId);assert.notEqual(x.browserId,z.browserId);
  }finally{await a.close();await b.close();}
});
test('labelled fixture search/GPS denied/errors/RTL/mobile+laptop; no autoplay on selection',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>{navigator.geolocation.getCurrentPosition=(_ok,fail)=>fail({code:1});});
  try{
    const page=await open(context);
    assert.ok(await page.getByText('LOCAL TEST FIXTURE — NOT LIVE ACCEPTANCE',{exact:true}).isVisible());
    await page.getByRole('button',{name:'Fixture place 01',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.touristFixture.events.filter(e=>e[0]==='start').length),0);
    await page.getByRole('button',{name:'Find my location',exact:true}).click();
    assert.ok(await page.getByText('Location permission was denied.',{exact:true}).isVisible());
    await page.getByRole('textbox',{name:'Search names'}).fill('place 15');
    await page.getByRole('button',{name:'Fixture place 15',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Fixture place 01',exact:true}).count(),0);
    await page.getByRole('textbox',{name:'Search names'}).fill('');
    await page.getByRole('combobox',{name:'Fixture scenario'}).selectOption('empty');await page.waitForFunction(()=>document.querySelector('[data-testid="catalog-state"]').textContent.includes('Nothing'));
    await page.getByRole('combobox',{name:'Fixture scenario'}).selectOption('error');await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
    await page.getByRole('combobox',{name:'Fixture scenario'}).selectOption('ready');await page.getByRole('button',{name:'Fixture place 01',exact:true}).waitFor();
    await page.locator('#tourist-language').selectOption('ar');
    await page.waitForFunction(()=>document.documentElement.dir==='rtl');
    for(const width of [390,1280]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await mkdir('.bootstrap-review',{recursive:true});await page.screenshot({path:`.bootstrap-review/poc-hao-01-fixture-${width}.png`,fullPage:true});}
  }finally{await context.close();}
});
test('media double exercises Play/Pause/Resume/sheet close/replaced/ended and exact 16 locale assets',async()=>{
  const context=await browser.newContext();
  try{
    const page=await open(context);
    // Labelled media double: lifecycle evidence only, no real narration/audio acceptance.
    await page.evaluate(()=>{window.touristFixture.media.play=()=>Promise.resolve();window.touristFixture.media.pause=()=>{};});
    await page.getByRole('button',{name:'Fixture place 01',exact:true}).click();
    await page.getByRole('button',{name:'Play',exact:true}).click();
    await page.getByTestId('player-state').filter({hasText:'playing'}).waitFor();
    await page.getByRole('button',{name:'Close sheet',exact:true}).click();
    assert.ok(await page.getByRole('region',{name:'Mini player'}).isVisible());
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    await page.getByTestId('player-state').filter({hasText:'paused'}).waitFor();
    await page.getByRole('button',{name:'Play',exact:true}).click();
    await page.getByTestId('player-state').filter({hasText:'playing'}).waitFor();
    assert.equal(await page.evaluate(()=>window.touristFixture.events.filter(e=>e[0]==='start').length),1);
    await page.getByRole('button',{name:'Fixture place 02',exact:true}).click();
    await page.getByRole('region',{name:'POI fixture details'}).getByRole('button',{name:'Play',exact:true}).click();
    await page.waitForFunction(()=>window.touristFixture.events.filter(e=>e[0]==='start').length===2);
    assert.ok(await page.evaluate(()=>window.touristFixture.events.some(e=>e[0]==='end'&&e[3]==='replaced')));
    await page.evaluate(()=>window.touristFixture.media.dispatchEvent(new Event('ended')));
    await page.waitForFunction(()=>window.touristFixture.events.some(e=>e[0]==='end'&&e[3]==='completed'));
    const codes=await page.locator('#tourist-language option').evaluateAll(elements=>elements.map(e=>e.value));
    assert.equal(codes.length,16);
    const sources=new Set();
    for(const code of codes){
      await page.locator('#tourist-language').selectOption(code);
      await page.getByRole('button',{name:'Fixture place 01',exact:true}).click();
      assert.ok(await page.getByRole('region',{name:'POI fixture details'}).innerText().then(text=>text.includes(`· ${code} ·`)));
      await page.getByRole('region',{name:'POI fixture details'}).getByRole('button').last().click();
      await page.waitForFunction(c=>window.touristFixture.playerState.item?.languageCode===c,code);
      sources.add(await page.evaluate(()=>window.touristFixture.media.src));
    }
    assert.equal(sources.size,16);
    await context.setOffline(true);
    await page.waitForFunction(()=>document.documentElement.lang==='en'&&window.touristFixture.playerState.state==='idle');
    assert.equal(await page.getByRole('region',{name:'Mini player'}).count(),0);
  }finally{await context.close();}
});
test('native audio rejection displays retryable error and text remains available',async()=>{
  const context=await browser.newContext();
  await context.route('https://fixture.invalid/**',route=>route.abort());
  try{
    const page=await open(context);await page.getByRole('button',{name:'Fixture place 01',exact:true}).click();
    await page.getByRole('button',{name:'Play',exact:true}).click();
    await page.getByTestId('player-state').filter({hasText:'error'}).waitFor();
    assert.ok(await page.getByRole('region',{name:'POI fixture details'}).isVisible());
    assert.ok(await page.getByRole('region',{name:'Mini player'}).getByRole('button',{name:'Play',exact:true}).isVisible());
  }finally{await context.close();}
});
