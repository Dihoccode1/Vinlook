import {readFile,stat,mkdir,writeFile,realpath,access,unlink} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {importOsm,COUNTRY_PROFILE_VERSION} from '../../../packages/poc-routing/src/importer.mjs';
import {partitionGraph,TILE_FORMAT} from '../../../packages/poc-routing/src/tiles.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
try{
  const {values}=parseArgs({strict:true,options:{input:{type:'string'},boundary:{type:'string'},out:{type:'string'},profile:{type:'string'}}});
  if(!values.input||!values.boundary||!values.out||values.profile!==COUNTRY_PROFILE_VERSION)throw Error('EXPLICIT_PROFILE_AND_LOCAL_PATHS_REQUIRED');
  for(const value of [values.input,values.boundary,values.out])if(/^(?:[\\/]{2}|[a-z]+:\/\/)/i.test(value))throw Error('LOCAL_PATH_REQUIRED');
  const inputPath=resolve(values.input),boundaryPath=resolve(values.boundary),out=resolve(values.out);
  if((await stat(inputPath)).size>256*1048576||(await stat(boundaryPath)).size>4*1048576)throw Error('INPUT_BYTE_BUDGET');
  let current=await realpath(dirname(out));
  for(;;){try{await access(join(current,'.git'));throw Error('OUTPUT_INSIDE_GIT');}catch(error){if(error.code!=='ENOENT')throw error;}const parent=dirname(current);if(parent===current)break;current=parent;}
  const raw=await readFile(inputPath),boundary=await readFile(boundaryPath),input=JSON.parse(raw.toString('utf8'));
  if(!/^[a-zA-Z0-9._-]{1,100}$/.test(input.graphVersion)||input.source?.kind!=='osm'||input.source.license!=='ODbL-1.0'
    ||!/^https:\/\//.test(input.source.snapshot)||!/^[a-f0-9]{64}$/.test(input.source.sha256))throw Error('SOURCE_PROVENANCE_REQUIRED');
  const imported=importOsm(input.osm,{nodes:1500000,ways:300000,relations:5000,edges:3500000,tags:128,wayRefs:2000,relationMembers:2000,totalRefs:2500000},{profileVersion:values.profile});
  console.log(JSON.stringify({phase:'imported',...imported.report}));
  const degrees=0.01,partitioned=partitionGraph(imported.graph,{degrees,nodes:1500000,edges:3500000,tiles:16384,tileNodes:25000,tileEdges:50000});
  await mkdir(out);await writeFile(join(out,'.incomplete'),'tile build in progress',{flag:'wx'});await mkdir(join(out,'tiles'));
  const entries=[];let bytes=0,maxTileBytes=0;
  for(const [id,tile] of partitioned.tiles){
    const data=Buffer.from(JSON.stringify({format:TILE_FORMAT,graphVersion:input.graphVersion,profileVersion:values.profile,id,nodes:tile.nodes,edges:tile.edges}));
    if(data.length>16*1048576||bytes+data.length>512*1048576)throw Error('TILE_BYTE_BUDGET');
    await writeFile(join(out,'tiles',id+'.json'),data,{flag:'wx'});bytes+=data.length;maxTileBytes=Math.max(maxTileBytes,data.length);
    entries.push({id,url:`tiles/${id}.json`,bytes:data.length,sha256:hash(data),snapBounds:tile.snapBounds,nodes:tile.nodes.length,edges:tile.edges.length});
  }
  const manifest={format:TILE_FORMAT,graphVersion:input.graphVersion,profileVersion:values.profile,degrees,topology:'outgoing-owned-by-source-node',source:input.source,
    inputSha256:hash(raw),boundarySha256:hash(boundary),tiles:entries,report:{...imported.report,...partitioned.report,totalTileBytes:bytes,maxTileBytes,releaseReady:false}};
  await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
  await writeFile(join(out,'boundary.geojson'),boundary,{flag:'wx'});
  await writeFile(join(out,'complete.json'),JSON.stringify({manifestSha256:hash(await readFile(join(out,'manifest.json'))),files:entries.length+2}),{flag:'wx'});
  await unlink(join(out,'.incomplete')); // Only the marker created by this invocation.
  console.log(JSON.stringify(manifest.report));
}catch(error){console.error(JSON.stringify({error:typeof error.code==='string'?error.code:'TILE_BUILD_FAILED',releaseReady:false}));process.exitCode=1;}
