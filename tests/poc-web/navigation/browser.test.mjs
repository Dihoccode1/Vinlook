import {test} from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH).href);
const base=process.env.VINLOOK_UI_TEST_ORIGIN??'http://127.0.0.1:5176';assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
test('online navigation panel starts explicitly, reports permission denial, cancels GPS and marks arrival without autoplay',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await page.goto(base+'/test/navigation-fixture.html');await page.getByRole('button',{name:'Walk to Labelled test place',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Find my location'}).waitFor();await page.evaluate(()=>window.navigationFixture.deny({code:1}));
  await page.getByRole('status').filter({hasText:'Location permission was denied.'}).waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.navigationFixture.cleared),1);
  await page.getByRole('button',{name:'Walk to Labelled test place',exact:true}).click();
  await page.evaluate(()=>window.navigationFixture.fix({timestamp:1,coords:{longitude:106.7,latitude:10.7,accuracy:5}}));
  await page.waitForFunction(()=>window.navigationFixture.controller.getSnapshot().status==='navigating');
  await page.evaluate(()=>window.navigationFixture.fix({timestamp:2,coords:{longitude:106.71,latitude:10.7,accuracy:5}}));
  await page.getByRole('status').filter({hasText:'You have arrived.'}).waitFor();assert.equal(await page.locator('audio').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'.bootstrap-review/issue79-online-navigation-mobile.png',fullPage:true});
 }finally{await browser.close();}
});

test('unavailable or imprecise desktop GPS explains the requirement and Retry reacquires a location before routing',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await page.goto(base+'/test/navigation-fixture.html');
  await page.getByRole('button',{name:'Walk to Labelled test place',exact:true}).click();
  await page.evaluate(()=>window.navigationFixture.deny({code:2}));
  await page.getByRole('status').filter({hasText:'Your location is unavailable.'}).waitFor();
  await page.getByText(/Walking directions need a position accurate to 50 m/).waitFor();
  await page.screenshot({path:'.bootstrap-review/walking-gps-unavailable.png',fullPage:true});
  assert.equal(await page.evaluate(()=>window.navigationFixture.controller.getSnapshot().route),null);
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.navigationFixture.cleared),1);
  await page.evaluate(()=>window.navigationFixture.fix({timestamp:1,coords:{longitude:106.7,latitude:10.7,accuracy:500}}));
  assert.equal(await page.evaluate(()=>window.navigationFixture.controller.getSnapshot().route),null);
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await page.evaluate(()=>window.navigationFixture.fix({timestamp:2,coords:{longitude:106.7,latitude:10.7,accuracy:5}}));
  await page.waitForFunction(()=>window.navigationFixture.controller.getSnapshot().status==='navigating');
  assert.equal(await page.getByText(/Walking directions need a position accurate to 50 m/).count(),0);
  await page.screenshot({path:'.bootstrap-review/walking-gps-recovered.png',fullPage:true});
 }finally{await browser.close();}
});
