import {test} from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH).href);
const base=process.env.VINLOOK_UI_TEST_ORIGIN??'http://127.0.0.1:5174';assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
test('labelled Monitor keeps count after network error, clears protected data on401',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:900}});
  try{await page.goto(base+'/test/monitor-fixture.html');await page.getByRole('heading',{name:'Current usage'}).waitFor();
    assert.ok((await page.getByRole('region',{name:'Current counts'}).innerText()).includes('Online visitors: 2'));
    await page.evaluate(()=>window.monitorFixture.fail=true);await page.getByRole('button',{name:'Refresh now'}).click();await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.includes('stale'));
    assert.ok((await page.getByRole('region',{name:'Current counts'}).innerText()).includes('Online visitors: 2'));
    await page.screenshot({path:'.bootstrap-review/poc-hao-monitor-stale.png',fullPage:true});
    await page.evaluate(()=>window.monitorFixture.unauthorized=true);await page.getByRole('button',{name:'Refresh now'}).click();await page.getByText('Sign in with an active Staff or Manager account.',{exact:true}).waitFor();assert.equal(await page.getByRole('region',{name:'Current counts'}).count(),0);
  }finally{await browser.close();}
});
