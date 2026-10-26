import {readFile,writeFile,mkdir,mkdtemp,lstat,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=fileURLToPath(new URL('../../../',import.meta.url));
try{
 if(process.env.VERCEL!=='1'&&process.env.VINLOOK_PREPARE_ROUTING!=='1'){console.log(JSON.stringify({routingAssets:'not_requested'}));process.exit(0);}
 const release=JSON.parse(await readFile(join(root,'data/poc/routing-release.json'),'utf8'));
 if(!/^[A-Za-z0-9._-]{1,100}$/.test(release.graphVersion)||!/^https:\/\/github\.com\/Dihoccode1\/Vinlook\/releases\/download\/[A-Za-z0-9._-]+\/hcmc-r2-v1\.tar\.gz$/.test(release.archiveUrl)
  ||!['archiveSha256','manifestSha256'].every(k=>/^[a-f0-9]{64}$/.test(release[k]))||!Number.isSafeInteger(release.archiveBytes)||release.archiveBytes>100000000)throw Error('INVALID_RELEASE_PIN');
 const target=resolve(root,'apps/web/public/routing',release.graphVersion),parent=resolve(root,'apps/web/public/routing');
 if(!target.startsWith(parent+'/')&&!target.startsWith(parent+'\\'))throw Error('OUTPUT_PATH_DENIED');
 try{const prior=JSON.parse(await readFile(join(target,'.prepared.json'),'utf8'));if(prior.manifestSha256!==release.manifestSha256)throw Error('EXISTING_ASSETS_MISMATCH');console.log(JSON.stringify({routingAssets:'already_prepared',graphVersion:release.graphVersion}));process.exit(0);}catch(e){if(e.code!=='ENOENT')throw e;}
 const work=await mkdtemp(join(tmpdir(),'vinlook-r2-host-')),archive=join(work,'graph.tar.gz'),stage=join(work,'unpacked');
 let bytes;
 if(process.env.VINLOOK_ROUTING_ARCHIVE_PATH){bytes=await readFile(process.env.VINLOOK_ROUTING_ARCHIVE_PATH);}
 else{
  const response=await fetch(release.archiveUrl,{signal:AbortSignal.timeout(180000),credentials:'omit'});
  if(!response.ok||!response.body)throw Error('ARCHIVE_UNAVAILABLE');
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.byteLength;if(size>release.archiveBytes)throw Error('ARCHIVE_BYTE_LIMIT');chunks.push(chunk);}
  bytes=Buffer.concat(chunks);
 }
 if(bytes.length!==release.archiveBytes||hash(bytes)!==release.archiveSha256)throw Error('ARCHIVE_CHECKSUM_FAILED');
 await writeFile(archive,bytes,{flag:'wx'});
 const {stdout}=await exec('tar',['-tzf',archive],{maxBuffer:1000000,timeout:60000});
 const names=stdout.trim().split(/\r?\n/);
 if(names.length>6000||names.some(n=>!['manifest.json','boundary.geojson','complete.json','tiles/'].includes(n)&&!/^tiles\/-?\d+_-?\d+\.json$/.test(n)))throw Error('ARCHIVE_PATH_DENIED');
 await mkdir(stage);await exec('tar',['-xzf',archive,'-C',stage],{timeout:120000});
 const manifestBytes=await readFile(join(stage,'manifest.json'));if(hash(manifestBytes)!==release.manifestSha256)throw Error('MANIFEST_CHECKSUM_FAILED');
 const manifest=JSON.parse(manifestBytes),complete=JSON.parse(await readFile(join(stage,'complete.json'),'utf8'));
 if(manifest.graphVersion!==release.graphVersion||manifest.profileVersion!==release.profileVersion||complete.manifestSha256!==release.manifestSha256
  ||!Array.isArray(manifest.tiles)||manifest.tiles.length!==5162||complete.files!==manifest.tiles.length+2)throw Error('MANIFEST_IDENTITY_FAILED');
 const files=['manifest.json','boundary.geojson','complete.json'],seen=new Set();let total=0;
 for(const entry of manifest.tiles){
  if(!/^tiles\/-?\d+_-?\d+\.json$/.test(entry.url)||seen.has(entry.url)||!Number.isSafeInteger(entry.bytes)||entry.bytes>1000000||!(/^[a-f0-9]{64}$/).test(entry.sha256))throw Error('TILE_ENTRY_FAILED');
  seen.add(entry.url);const path=join(stage,entry.url),info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||info.size!==entry.bytes)throw Error('TILE_FILE_FAILED');
  const tile=await readFile(path);if(hash(tile)!==entry.sha256)throw Error('TILE_CHECKSUM_FAILED');total+=tile.length;if(total>512000000)throw Error('TOTAL_BYTE_LIMIT');files.push(entry.url);
 }
 const boundary=await readFile(join(stage,'boundary.geojson'));if(hash(boundary)!==manifest.boundarySha256)throw Error('BOUNDARY_CHECKSUM_FAILED');
 await mkdir(parent,{recursive:true});await mkdir(target);await mkdir(join(target,'tiles'));
 for(const name of files)await copyFile(join(stage,name),join(target,name));
 await writeFile(join(target,'attribution.json'),JSON.stringify({attribution:release.attribution,license:release.license,licenseUrl:release.licenseUrl,sourceSnapshot:release.sourceSnapshot,sourceSha256:release.sourceSha256,buildSource:'https://github.com/Dihoccode1/Vinlook/tree/c7dc8a2821e687459eb59f312de884194ca133ef/scripts/poc/routing'},null,2));
 await writeFile(join(target,'.prepared.json'),JSON.stringify({graphVersion:release.graphVersion,manifestSha256:release.manifestSha256,tiles:manifest.tiles.length,totalTileBytes:total}));
 console.log(JSON.stringify({routingAssets:'verified_and_prepared',graphVersion:release.graphVersion,tiles:manifest.tiles.length,totalTileBytes:total}));
}catch(error){console.error(JSON.stringify({routingAssets:'failed',code:/^[A-Z_]+$/.test(error.message)?error.message:'PREPARATION_FAILED'}));process.exitCode=1;}
