import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseBuffer} from 'music-metadata';
import {createTranscoder,verifyBinaries,childOutput} from '../src/adapters/transcode.js';
const config={ffmpeg:'/usr/bin/ffmpeg',ffprobe:'/usr/bin/ffprobe'};
test('pinned Linux FFmpeg converts real 90-second PCM into bounded independently parsed mono MP3',async()=>{
 assert.equal(process.platform,'linux');await verifyBinaries(config);
 const wav=await childOutput(config.ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=24000:duration=90','-ac','1','-c:a','pcm_s16le','-f','wav','pipe:1'],Buffer.alloc(0),{limit:8388608});
 // Pipe WAV uses unspecified RIFF/data lengths; replace only fixture header lengths with actual values.
 wav.writeUInt32LE(wav.length-8,4);const marker=wav.indexOf(Buffer.from('data'));assert.ok(marker>0);wav.writeUInt32LE(wav.length-marker-8,marker+4);
 const start=performance.now(),mp3=await createTranscoder(config)(wav),metadata=await parseBuffer(mp3,{mimeType:'audio/mpeg'},{duration:true});
 assert.equal(metadata.format.numberOfChannels,1);assert.equal(metadata.format.sampleRate,24000);assert.ok(metadata.format.duration>=90&&metadata.format.duration<=150);assert.ok(mp3.length<=3145728);assert.ok(performance.now()-start<20000);
 console.log(JSON.stringify({kind:'synthetic-linux-ffmpeg-smoke',seconds:metadata.format.duration,bytes:mp3.length,wallMs:Math.round(performance.now()-start),rss:process.memoryUsage().rss}));
});
