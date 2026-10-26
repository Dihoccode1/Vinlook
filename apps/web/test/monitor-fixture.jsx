import React from 'react';import {createRoot} from 'react-dom/client';import {Monitor} from '../src/staff/monitor/Monitor.jsx';
if(!import.meta.env.DEV)throw Error('FIXTURE_FORBIDDEN');
window.monitorFixture={fail:false,unauthorized:false};
const api={authorize:async()=>{if(window.monitorFixture.unauthorized)throw Object.assign(Error(),{status:401});return {account:{role:'Staff',status:'active'}};},summary:async()=>{if(window.monitorFixture.fail)throw Error();const time=new Date().toISOString();return {asOf:time,refreshedAt:time,onlineVisitors:2,currentListeners:1,byPoi:[{poiId:'000000000000000000000001',currentListeners:1}]};},health:async()=>({components:[{name:'worker',status:'unknown',checkedAt:null}]}),jobs:async()=>({status:'unknown',counts:null})};
createRoot(document.getElementById('root')).render(<><aside style={{background:'#fff1bd',padding:16}}>LOCAL MONITOR FIXTURE — NOT LIVE COUNTS</aside><Monitor api={api}/></>);
