import test from 'node:test';
import assert from 'node:assert/strict';
import {west_saigon_pois} from '../../src/content/west-saigon-pois.js';
import {saigon_pois} from '../../src/content/saigon-pois.js';
import {render_editorial} from '../../src/content/editorial-locales.js';
import {languages} from '../../src/modules/languages/languages.js';
test('new catalog has ten distinct POIs in all four requested areas and complete text coverage',()=>{
  assert.equal(west_saigon_pois.length,10);assert.equal(new Set(west_saigon_pois.map(p=>p.slug)).size,10);
  const existing=new Set<string>(saigon_pois.map(p=>p.slug));
  assert.deepEqual(Object.fromEntries(['Quận 5','Quận 10','Tân Phú','Tân Bình'].map(d=>[d,west_saigon_pois.filter(p=>p.district===d).length])),{'Quận 5':3,'Quận 10':3,'Tân Phú':2,'Tân Bình':2});
  for(const poi of west_saigon_pois){assert.ok(!existing.has(poi.slug));assert.ok(poi.latitude>10.7&&poi.latitude<10.9&&poi.longitude>106.6&&poi.longitude<106.8);assert.ok(poi.visitor_description.length>50&&poi.source_url.startsWith('https://')&&poi.osm_url.startsWith('https://www.openstreetmap.org/'));for(const lang of languages){const text=render_editorial(poi,lang.code);assert.ok(text.includes(poi.name)&&text.includes(poi.address)&&text.length>500&&!text.includes('undefined'));}}
});
