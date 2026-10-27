import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../../apps/web/src/tourist/player.js';

test('ten-second seek clamps to real media bounds without changing playback state or telemetry',async()=>{
 const events=[],states=[];
 let plays=0;
 const media={currentTime:5,duration:100,addEventListener(){},removeEventListener(){},pause(){},load(){},removeAttribute(){},async play(){plays++;}};
 const player=createPlayer({media,telemetry:{start:()=>events.push('start'),end:()=>events.push('end')},onChange:s=>states.push(s.state)});
 const item={id:'fixture',languageCode:'en',audio:{url:'https://fixture.invalid/audio'}};
 assert.equal(player.seekBy(10),false);
 await player.play(item);const initial=[...events];
 assert.equal(player.seekBy(-10),true);assert.equal(media.currentTime,0);
 player.seekBy(10);assert.equal(media.currentTime,10);assert.equal(states.at(-1),'playing');
 media.currentTime=95;player.seekBy(10);assert.equal(media.currentTime,100);
 player.pause();player.seekBy(-10);assert.equal(media.currentTime,90);assert.equal(states.at(-1),'paused');
 assert.equal(plays,1);assert.deepEqual(events,initial);
 media.duration=NaN;assert.equal(player.seekBy(10),false);
 media.duration=Infinity;assert.equal(player.seekBy(10),false);
 media.duration=100;assert.equal(player.seekBy(NaN),false);
 player.close();assert.equal(player.seekBy(10),false);
});

test('a native seek rejection preserves the current player state',async()=>{
 const media={get currentTime(){return 0;},set currentTime(_value){throw Error('not seekable');},duration:100,addEventListener(){},removeEventListener(){},pause(){},load(){},removeAttribute(){},async play(){}};
 let state;const player=createPlayer({media,telemetry:{start(){},end(){}},onChange:s=>state=s.state});
 await player.play({id:'fixture',languageCode:'en',audio:{url:'https://fixture.invalid/audio'}});
 assert.equal(player.seekBy(10),false);assert.equal(state,'playing');player.dispose();
});
