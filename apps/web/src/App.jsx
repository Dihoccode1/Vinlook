import {TouristApp} from './tourist/TouristApp.jsx';
import {createContentAdapter} from './adapters/content.js';
import {publicMapStyle} from './tourist/catalog.js';
import {createUsageAdapter} from './adapters/usage.js';
import './tourist/tourist.css';
let content=null,mapStyleUrl=null,usage=null;
try{content=createContentAdapter(import.meta.env.VITE_CONTENT_ORIGIN);}catch{/* Explicit unconfigured state; no invented public POIs. */}
try{mapStyleUrl=publicMapStyle(import.meta.env.VITE_MAP_STYLE_URL,{development:import.meta.env.DEV});}catch{/* Show missing map source without leaking its URL. */}
try{if(import.meta.env.VITE_USAGE_ORIGIN)usage=createUsageAdapter(import.meta.env.VITE_USAGE_ORIGIN);}catch{/* Optional telemetry never blocks the guide. */}
export function App(){return <TouristApp content={content} mapStyleUrl={mapStyleUrl} usage={usage}/>;}
