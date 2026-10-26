import {TouristApp} from './tourist/TouristApp.jsx';
import {createContentAdapter} from './adapters/content.js';
import {publicMapStyle} from './tourist/catalog.js';
import './tourist/tourist.css';
let content=null,mapStyleUrl=null;
try{content=createContentAdapter(import.meta.env.VITE_CONTENT_ORIGIN);}catch{/* Explicit unconfigured state; no invented public POIs. */}
try{mapStyleUrl=publicMapStyle(import.meta.env.VITE_MAP_STYLE_URL,{development:import.meta.env.DEV});}catch{/* Show missing map source without leaking its URL. */}
export function App(){return <TouristApp content={content} mapStyleUrl={mapStyleUrl}/>;}
