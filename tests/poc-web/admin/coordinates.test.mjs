import {test} from 'node:test';import assert from 'node:assert/strict';
import {emptyDraft,editCoordinate,validDraftCoordinates} from '../../../apps/web/src/staff/draft-coordinates.js';
test('missing/partial/out-of-range coordinates cannot be saved and blank never silently becomes zero',()=>{
  assert.equal(validDraftCoordinates(emptyDraft),false);
  let location=editCoordinate(null,0,'106.7');assert.equal(validDraftCoordinates({...emptyDraft,location}),false);
  location=editCoordinate(location,1,'10.7');assert.equal(validDraftCoordinates({...emptyDraft,location}),true);
  assert.equal(validDraftCoordinates({...emptyDraft,location:editCoordinate(location,0,'181')}),false);
  assert.equal(validDraftCoordinates({...emptyDraft,location:editCoordinate(location,1,'')}),false);
  assert.equal(editCoordinate(location,1,'').coordinates[1],null);
});
test('entrance is either absent or complete; explicitly entered zero remains a valid coordinate',()=>{
  const location={type:'Point',coordinates:[0,0]};assert.equal(validDraftCoordinates({...emptyDraft,location}),true);
  let entrance=editCoordinate(null,0,'106.7',{nullable:true});assert.equal(validDraftCoordinates({...emptyDraft,location,entrance}),false);
  entrance=editCoordinate(entrance,0,'',{nullable:true});assert.equal(entrance,null);assert.equal(validDraftCoordinates({...emptyDraft,location,entrance}),true);
});
