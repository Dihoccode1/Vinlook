# Local tooling only; requirements-pbf.txt. Output candidates remain unaccepted until review.
import osmium,json,time,os,argparse,hashlib
from pathlib import Path
from shapely.geometry import shape,LineString
from shapely.prepared import prep
parser=argparse.ArgumentParser(description='Extract supported ways intersecting the actual HCMC polygon; no network or publishing.')
parser.add_argument('--root',required=True);parser.add_argument('--graph-version',required=True)
args=parser.parse_args();root=Path(args.root).resolve(strict=True)
if any((parent/'.git').exists() for parent in [root,*root.parents]):raise RuntimeError('OUTPUT_INSIDE_GIT')
source=root/'vietnam.osm.pbf';started=time.time()
provenance=json.loads((root/'vietnam.osm.pbf.provenance.json').read_text(encoding='utf-8'))
with source.open('rb') as checked:
 if hashlib.file_digest(checked,'sha256').hexdigest()!=provenance['sha256']:raise RuntimeError('SOURCE_CHECKSUM_MISMATCH')
boundary=json.loads((root/'hcmc-boundary.geojson').read_text(encoding='utf-8'));geometry=shape(boundary['geometry'])
if not geometry.is_valid or geometry.is_empty:raise RuntimeError('INVALID_BOUNDARY')
prepared=prep(geometry);bbox=geometry.bounds
supported=set('footway pedestrian path steps residential living_street service unclassified tertiary secondary primary cycleway track tertiary_link secondary_link primary_link'.split())
ways=[];nodes={};explicit=0;refs=0;maxrefs=0
processor=osmium.FileProcessor(source).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('highway'))
for w in processor:
 if w.tags.get('highway') not in supported:continue
 coords=[(n.lon,n.lat) for n in w.nodes]
 if len(coords)<2:raise RuntimeError('INVALID_WAY')
 if max(p[0] for p in coords)<bbox[0] or min(p[0] for p in coords)>bbox[2] or max(p[1] for p in coords)<bbox[1] or min(p[1] for p in coords)>bbox[3]:continue
 if not prepared.intersects(LineString(coords)):continue
 tags=dict(w.tags);wayrefs=[str(n.ref) for n in w.nodes];refs+=len(wayrefs);maxrefs=max(maxrefs,len(wayrefs))
 ways.append({'id':str(w.id),'nodes':wayrefs,'tags':tags})
 if tags.get('foot',tags.get('access')) in ('yes','designated','permissive'):explicit+=1
 for n,p in zip(w.nodes,coords):nodes.setdefault(n.ref,{'id':str(n.ref),'lon':p[0],'lat':p[1]})
 if len(ways)>2000000 or len(nodes)>8000000 or refs>20000000:raise RuntimeError('EXTRACT_RESOURCE_CAP')
print(json.dumps({'phase':'ways_selected','ways':len(ways),'nodes':len(nodes),'refs':refs}),flush=True)
for n in osmium.FileProcessor(source,entities=osmium.osm.NODE).with_filter(osmium.filter.IdFilter(nodes.keys())):
 if n.tags:nodes[n.id]['tags']=dict(n.tags)
selected={int(w['id']) for w in ways};relations=[];trimmed=0
for r in osmium.FileProcessor(source,entities=osmium.osm.RELATION):
 tags=dict(r.tags)
 if tags.get('type')!='restriction' and not any(k.startswith('restriction') for k in tags):continue
 members=[{'type':'way' if m.type=='w' else 'node','ref':str(m.ref)} for m in r.members if m.type=='w' and m.ref in selected or m.type=='n' and m.ref in nodes]
 if not members:continue
 trimmed+=len(r.members)-len(members);relations.append({'id':str(r.id),'tags':tags,'members':members})
prov=json.loads((root/'vietnam.osm.pbf.provenance.json').read_text(encoding='utf-8'));output=root/'hcmc-build-input.json'
with output.open('x',encoding='utf-8') as f:json.dump({'graphVersion':args.graph_version,'source':{'kind':'osm','snapshot':prov['finalUrl'],'sha256':prov['sha256'],'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors'},'osm':{'complete':True,'nodes':list(nodes.values()),'ways':ways,'relations':relations}},f,ensure_ascii=False,separators=(',',':'))
report={'boundaryRelation':1973756,'boundaryBbox':list(bbox),'selectedWays':len(ways),'referencedNodes':len(nodes),'references':refs,'maxWayReferences':maxrefs,'restrictionRelations':len(relations),'trimmedRestrictionMembers':trimmed,'explicitFootWays':explicit,'normalizedJsonBytes':output.stat().st_size,'directedSegmentUpperBound':2*(refs-len(ways)),'elapsedSeconds':round(time.time()-started,2),'coverageVerified':False,'releaseReady':False}
(root/'hcmc-measurements.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report),flush=True)
