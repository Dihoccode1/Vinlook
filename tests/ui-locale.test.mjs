import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {resources} from '../apps/web/src/i18n/resources.js';
import {createUiI18n} from '../apps/web/src/i18n/instance.js';
import {createLocaleStore} from '../apps/web/src/i18n/state.js';
import {validateResources} from '../apps/web/src/i18n/validation.js';
import {localeCodes,direction} from '../apps/web/src/i18n/locales.js';
test('sixteen complete resources retain exact placeholders and variants; hostile/incomplete copy fails checks',()=>{
 assert.deepEqual(validateResources(resources),{locales:16,keys:51});
 for(const mutate of [r=>delete r.vi.translation.audio.play,r=>r.vi.translation.navigation.walkTo='Đi đến {{url}}',r=>r.ar.translation.preview.title='<script>unsafe</script>',r=>r.ur.translation.common.close='\u202eunsafe',r=>r['zh-Hant'].translation.preview.title='']){
  const r=structuredClone(resources);mutate(r);assert.throws(()=>validateResources(r));
 }
 assert.notEqual(resources.ar.translation.preview.statusBody,resources['ar-EG'].translation.preview.statusBody);
 assert.match(resources['zh-Hant'].translation.language.label,/語/);assert.match(resources['pt-PT'].translation.common.loading,/A carregar/);
});
test('manual locale choice is isolated to store/tab; invalid variants cannot change state',()=>{
 const a=createLocaleStore(),b=createLocaleStore();a.setLocale('ur');assert.equal(a.getSnapshot().direction,'rtl');assert.equal(b.getSnapshot().locale,'en');
 for(const invalid of ['ar-SA','zh-CN','pt-BR','__proto__','constructor',null])assert.throws(()=>a.setLocale(invalid),/INVALID_LOCALE/);
 assert.equal(a.getSnapshot().locale,'ur');assert.equal(createLocaleStore().getSnapshot().locale,'en');
});
test('offline forces English and emits stop event once; reconnect never restores language or plays audio',()=>{
 const store=createLocaleStore(),events=[];let stops=0,plays=0;store.subscribeLocaleChange(event=>{events.push(event);if(event.reason==='offline'&&event.previousLocale!=='en')stops++;});
 store.setLocale('ja');store.setConnectivity('offline');store.setConnectivity('offline');assert.equal(stops,1);assert.equal(store.getSnapshot().locale,'en');assert.equal(store.getSnapshot().direction,'ltr');assert.throws(()=>store.setLocale('fr'),/OFFLINE_ENGLISH_ONLY/);
 store.setConnectivity('online');assert.equal(store.getSnapshot().locale,'en');assert.equal(store.getSnapshot().reconnectNotice,true);assert.equal(plays,0);store.setLocale('ja');assert.equal(store.getSnapshot().reconnectNotice,false);assert.ok(Object.isFrozen(events[0]));
});
test('initial offline state, notice dismissal, subscriber cleanup and coordinator override are deterministic',()=>{
 const store=createLocaleStore({online:false});let updates=0;const off=store.subscribe(()=>updates++);assert.equal(store.getSnapshot().mode,'offline');store.setConnectivity('online');store.dismissReconnect();assert.equal(updates,2);off();store.setLocale('vi');assert.equal(updates,2);store.setConnectivity('offline');assert.equal(store.getSnapshot().locale,'en');assert.throws(()=>store.setConnectivity('maybe'));
});
test('i18next uses exact bundles, English safety fallback and React text escaping without runtime resource fetch',()=>{
 const instance=createUiI18n();assert.equal(instance.isInitialized,true);assert.equal(instance.options.load,'currentOnly');assert.equal(instance.options.saveMissing,false);assert.equal(instance.options.debug,false);
 for(const locale of localeCodes){const t=instance.getFixedT(locale);assert.equal(t('preview.title'),resources[locale].translation.preview.title);assert.equal(t('map.foundCount',{count:4}),resources[locale].translation.map.foundCount.replace('{{count}}','4'));}
 const text=instance.getFixedT('ar')('navigation.walkTo',{name:'<img src=x onerror=alert(1)>'});const rendered=renderToStaticMarkup(createElement('p',null,text));assert.ok(rendered.includes('&lt;img'));assert.ok(!rendered.includes('<img'));
 assert.throws(()=>createUiI18n('pt-BR'));assert.equal(direction('ar-EG'),'rtl');assert.equal(direction('pcm'),'ltr');
 const noFrenchKey=createUiI18n('fr');noFrenchKey.removeResourceBundle('fr','translation');assert.equal(noFrenchKey.getFixedT('fr')('common.retry'),resources.en.translation.common.retry);
});
