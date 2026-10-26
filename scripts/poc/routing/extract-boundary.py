import osmium,json,time,math,argparse
from pathlib import Path
parser=argparse.ArgumentParser(description='Assemble current VN-SG boundary relation1973756 from local PBF.')
parser.add_argument('--root',required=True);args=parser.parse_args();directory=Path(args.root).resolve(strict=True)
if any((parent/'.git').exists() for parent in [directory,*directory.parents]):raise RuntimeError('OUTPUT_INSIDE_GIT')
root=str(directory);path=root+'/vietnam.osm.pbf';started=time.time();factory=osmium.geom.GeoJSONFactory()
processor=osmium.FileProcessor(path).with_locations().with_areas(osmium.filter.IdFilter([1973756])).with_filter(osmium.filter.EntityFilter(osmium.osm.AREA)).with_filter(osmium.filter.TagFilter(('ISO3166-2','VN-SG')))
found=[]
for area in processor:
 if area.orig_id()!=1973756 or area.from_way():continue
 geometry=json.loads(factory.create_multipolygon(area));points=[p for polygon in geometry['coordinates'] for ring in polygon for p in ring]
 bbox=[min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points)]
 found.append({'relationId':area.orig_id(),'name':area.tags.get('name'),'bbox':bbox,'polygons':len(geometry['coordinates']),'boundaryPoints':len(points),'geometry':geometry})
if len(found)!=1:raise RuntimeError('BOUNDARY_NOT_UNAMBIGUOUS')
with open(root+'/hcmc-boundary.geojson','x',encoding='utf-8') as f:json.dump({'type':'Feature','properties':{k:v for k,v in found[0].items() if k!='geometry'},'geometry':found[0]['geometry']},f,ensure_ascii=False)
print(json.dumps({k:v for k,v in found[0].items() if k!='geometry'},ensure_ascii=True));print(json.dumps({'seconds':round(time.time()-started,2)}))
