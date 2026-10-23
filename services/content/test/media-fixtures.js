import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
export const ids=()=>({poiId:new mongoose.Types.ObjectId(),revisionId:new mongoose.Types.ObjectId(),actorId:new mongoose.Types.ObjectId(),workSessionId:new mongoose.Types.ObjectId()});
export function intent(overrides={}){const refs=ids(),uploadId=randomUUID(),createdAt=new Date('2026-10-23T12:00:00.000Z');return{...refs,uploadId,kind:'thumbnail',expectedEditVersion:0,publicId:`vinlook/test/${refs.poiId}/${refs.revisionId}/thumbnail/${uploadId}`,resourceType:'image',status:'issued',createdAt,expiresAt:new Date(+createdAt+900000),...overrides};}
export const png=(background={r:10,g:20,b:30})=>sharp({create:{width:16,height:12,channels:3,background}}).png().toBuffer();
export function mp3(seconds=120,stereo=false,rate=44100){const count=Math.ceil(seconds*rate/1152),frame=Buffer.alloc(rate===48000?192:208);frame.set([255,251,rate===48000?84:80,stereo?0:192]);return Buffer.concat(Array.from({length:count},()=>frame));}
export function multipart(buffer,{extra=false,name='file'}={}){const boundary='vinlook-fixture-boundary';return{headers:{'content-type':`multipart/form-data; boundary=${boundary}`},bytes:Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="ignored.png"\r\nContent-Type: arbitrary/ignored\r\n\r\n`),buffer,Buffer.from(`\r\n${extra?`--${boundary}\r\nContent-Disposition: form-data; name="extra"\r\n\r\nx\r\n`:''}--${boundary}--\r\n`)])};}
