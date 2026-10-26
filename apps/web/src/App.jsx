import {TouristApp} from './tourist/TouristApp.jsx';
import {createContentAdapter} from './adapters/content.js';
import {publicMapStyle} from './tourist/catalog.js';
import {createUsageAdapter} from './adapters/usage.js';
import './tourist/tourist.css';
import {routingConfig} from './navigation/runtime.js';
let content=null,mapStyleUrl=null,usage=null,routing=null;
const hosted=__VINLOOK_HOSTED_ROUTING__,defaults=hosted?{VITE_ROUTING_MANIFEST_URL:new URL(hosted.manifestPath,location.origin).href,VITE_ROUTING_MANIFEST_SHA256:hosted.manifestSha256,VITE_ROUTING_GRAPH_VERSION:hosted.graphVersion}:{};
try{content=createContentAdapter(import.meta.env.VITE_CONTENT_ORIGIN);}catch{/* Explicit unconfigured state; no invented public POIs. */}
try{mapStyleUrl=publicMapStyle(import.meta.env.VITE_MAP_STYLE_URL||(hosted?new URL('/maps/osm-online.json',location.origin).href:null),{development:import.meta.env.DEV});}catch{/* Show missing map source without leaking its URL. */}
try{if(import.meta.env.VITE_USAGE_ORIGIN)usage=createUsageAdapter(import.meta.env.VITE_USAGE_ORIGIN);}catch{/* Optional telemetry never blocks the guide. */}
try{routing=routingConfig({VITE_ROUTING_MANIFEST_URL:import.meta.env.VITE_ROUTING_MANIFEST_URL??defaults.VITE_ROUTING_MANIFEST_URL,VITE_ROUTING_MANIFEST_SHA256:import.meta.env.VITE_ROUTING_MANIFEST_SHA256??defaults.VITE_ROUTING_MANIFEST_SHA256,VITE_ROUTING_GRAPH_VERSION:import.meta.env.VITE_ROUTING_GRAPH_VERSION??defaults.VITE_ROUTING_GRAPH_VERSION});}catch{/* Keep directions unavailable until an exact graph is configured. */}
export function App(){return <TouristApp content={content} mapStyleUrl={mapStyleUrl} usage={usage} routing={routing}/>;}
