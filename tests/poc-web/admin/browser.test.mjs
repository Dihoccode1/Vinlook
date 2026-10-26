import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH).href);
const base=process.env.VINLOOK_UI_TEST_ORIGIN??'http://127.0.0.1:5174';
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
test('Staff login requires explicit session; create/readback/version/conflict preserves input; no publish; reload logs out',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
  try{await page.goto(base+'/test/admin-fixture.html');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('synthetic');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByRole('heading',{name:'Draft',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Create POI',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Open / reopen session',exact:true}).click();await page.getByLabel('Name (English)',{exact:true}).fill('Fixture draft');await page.getByLabel('English source',{exact:true}).fill('Synthetic source');await page.getByRole('button',{name:'Create POI',exact:true}).click();
    await page.getByRole('button',{name:'Save draft',exact:true}).waitFor();assert.equal(await page.getByLabel('Name (English)',{exact:true}).inputValue(),'Fixture draft');assert.equal(await page.getByRole('button',{name:'Publish',exact:true}).count(),0);
    await page.evaluate(()=>window.adminFixture.conflict=true);await page.getByLabel('Name (English)',{exact:true}).fill('Unsaved after conflict');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Name (English)',{exact:true}).inputValue(),'Unsaved after conflict');
    await page.screenshot({path:'.bootstrap-review/poc-hao-admin-conflict-mobile.png',fullPage:true});page.on('dialog',d=>d.accept());await page.reload();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  }finally{await browser.close();}
});
test('Manager missing16 cannot publish; unsaved metadata blocks processing/review/submit and locale changes',async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
  try{await page.goto(base+'/test/admin-fixture.html?role=Manager');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('synthetic');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Open / reopen session',exact:true}).click();
    await page.getByLabel('Name (English)',{exact:true}).fill('Manager fixture');await page.getByLabel('English source',{exact:true}).fill('Synthetic source');await page.getByRole('button',{name:'Create POI',exact:true}).click();await page.getByRole('button',{name:'Publish',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Publish',exact:true}).isDisabled(),true);
    await page.getByLabel('Name (English)',{exact:true}).fill('Unsaved metadata');for(const name of ['Process selected locale','Submit for review','Approve exact locale'])assert.equal(await page.getByRole('button',{name,exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('combobox').isDisabled(),true);await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('select').disabled);assert.equal(await page.getByRole('button',{name:'Publish',exact:true}).isDisabled(),true);
  }finally{await browser.close();}
});
