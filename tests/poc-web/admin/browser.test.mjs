import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH).href);
const base=process.env.VINLOOK_UI_TEST_ORIGIN??'http://127.0.0.1:5174';
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);

test('Staff Monitoring opens without a work session and authority loss clears the whole workspace',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.goto(base+'/test/admin-fixture.html');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('synthetic');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByRole('button',{name:'Monitoring',exact:true}).click();await page.getByRole('heading',{name:'Current usage',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.adminFixture.calls.some(c=>c.path.endsWith('/work-sessions/open'))),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'Back to content',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Create POI',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Monitoring',exact:true}).click();await page.getByRole('heading',{name:'Current usage',exact:true}).waitFor();
    await page.evaluate(()=>window.adminFixture.monitorDenied=true);await page.getByRole('button',{name:'Refresh now',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();assert.equal(await page.getByRole('region',{name:'Current counts'}).count(),0);
  }finally{await browser.close();}
});

test('exact current audio confirmation cancels without write and approves vi/zh-Hant separately; mobile workspace fits',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.route('https://media.fixture.invalid/**',route=>route.abort());
    await page.goto(base+'/test/admin-fixture.html?review=1');
    await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('synthetic');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByRole('button',{name:'Open / reopen session',exact:true}).click();await page.getByLabel('Name (English)',{exact:true}).fill('Review fixture');await page.getByLabel('English source',{exact:true}).fill('Synthetic source');assert.equal(await page.getByRole('button',{name:'Create POI',exact:true}).isDisabled(),true);await page.getByLabel('location longitude',{exact:true}).fill('106.7');await page.getByLabel('location latitude',{exact:true}).fill('10.7');await page.getByRole('button',{name:'Create POI',exact:true}).click();
    await page.getByRole('combobox').waitFor();await page.getByRole('combobox').selectOption('vi');
    page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Approve exact locale',exact:true}).click();assert.deepEqual(await page.evaluate(()=>window.adminFixture.reviews),[]);
    for(const [index,code] of ['vi','zh-Hant'].entries()){
      await page.getByRole('combobox').selectOption(code);
      page.once('dialog',dialog=>{assert.ok(dialog.message().includes(`complete ${code} audio (120 seconds)`));assert.ok(dialog.message().includes(`editVersion ${index}`));return dialog.accept();});
      await page.getByRole('button',{name:'Approve exact locale',exact:true}).click();
      await page.waitForFunction(count=>window.adminFixture.reviews.length===count,index+1);await page.waitForFunction(()=>!document.querySelector('select').disabled);
    }
    const reviews=await page.evaluate(()=>window.adminFixture.reviews);assert.deepEqual(reviews.map(row=>[row.code,row.expectedEditVersion,row.expectedTextVersion]),[['vi',0,1],['zh-Hant',1,1]]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'.bootstrap-review/issue77-workspace-mobile.png',fullPage:true});
    await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'.bootstrap-review/issue77-workspace-desktop.png',fullPage:true});
  }finally{await browser.close();}
});
test('Staff login requires explicit session; create/readback/version/conflict preserves input; no publish; reload logs out',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
  try{await page.goto(base+'/test/admin-fixture.html');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('synthetic');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByRole('heading',{name:'Draft',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Create POI',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Open / reopen session',exact:true}).click();await page.getByLabel('Name (English)',{exact:true}).fill('Fixture draft');await page.getByLabel('English source',{exact:true}).fill('Synthetic source');assert.equal(await page.getByRole('button',{name:'Create POI',exact:true}).isDisabled(),true);await page.getByLabel('location longitude',{exact:true}).fill('106.7');await page.getByLabel('location latitude',{exact:true}).fill('10.7');await page.getByRole('button',{name:'Create POI',exact:true}).click();
    await page.getByRole('button',{name:'Save draft',exact:true}).waitFor();assert.equal(await page.getByLabel('Name (English)',{exact:true}).inputValue(),'Fixture draft');assert.equal(await page.getByRole('button',{name:'Publish',exact:true}).count(),0);
    await page.evaluate(()=>window.adminFixture.conflict=true);await page.getByLabel('Name (English)',{exact:true}).fill('Unsaved after conflict');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Name (English)',{exact:true}).inputValue(),'Unsaved after conflict');
    await page.screenshot({path:'.bootstrap-review/poc-hao-admin-conflict-mobile.png',fullPage:true});page.on('dialog',d=>d.accept());await page.reload();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  }finally{await browser.close();}
});
test('Manager missing16 cannot publish; unsaved metadata blocks processing/review/submit and locale changes',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
  try{await page.goto(base+'/test/admin-fixture.html?role=Manager');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('synthetic');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Open / reopen session',exact:true}).click();
    await page.getByLabel('Name (English)',{exact:true}).fill('Manager fixture');await page.getByLabel('English source',{exact:true}).fill('Synthetic source');assert.equal(await page.getByRole('button',{name:'Create POI',exact:true}).isDisabled(),true);await page.getByLabel('location longitude',{exact:true}).fill('106.7');await page.getByLabel('location latitude',{exact:true}).fill('10.7');await page.getByRole('button',{name:'Create POI',exact:true}).click();await page.getByRole('button',{name:'Publish',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Publish',exact:true}).isDisabled(),true);
    page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Dispatch next system Gemini job',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.adminFixture.calls.filter(c=>c.path.endsWith('/run-next')).length),0);
    page.once('dialog',dialog=>{assert.match(dialog.message(),/entire system/);return dialog.accept();});await page.getByRole('button',{name:'Dispatch next system Gemini job',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Dispatch acknowledged'}).waitFor();assert.equal(await page.evaluate(()=>window.adminFixture.calls.filter(c=>c.path.endsWith('/run-next')).length),1);
    await page.getByLabel('Name (English)',{exact:true}).fill('Unsaved metadata');for(const name of ['Process selected locale','Submit for review','Approve exact locale'])assert.equal(await page.getByRole('button',{name,exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('combobox').isDisabled(),true);await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('select').disabled);assert.equal(await page.getByRole('button',{name:'Publish',exact:true}).isDisabled(),true);
  }finally{await browser.close();}
});
