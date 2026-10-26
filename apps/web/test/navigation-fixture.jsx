import React from 'react';import {createRoot} from 'react-dom/client';
import {NavigationPanel} from '../src/navigation/NavigationPanel.jsx';
import {createNavigation} from '../src/navigation/controller.js';
import {LocaleProvider} from '../src/i18n/provider.jsx';import '../src/styles.css';
if(!import.meta.env.DEV)throw Error('FIXTURE_FORBIDDEN');
window.navigationFixture={cleared:0,terminated:0};let request=0;
const destination={poiId:'fixture-poi',revisionId:'fixture-revision',graphVersion:'fixture-graph',entrance:[106.71,10.7]};
const controller=createNavigation({maxRoutePoints:20,maxCalculations:10,uuid:()=>String(++request),
 geolocation:{watchPosition:(fix,error)=>{window.navigationFixture.fix=fix;window.navigationFixture.deny=error;return request+1;},clearWatch:()=>window.navigationFixture.cleared++},
 workerFactory:()=>({calculate:async({token})=>({...token,geometry:[[106.7,10.7],[106.71,10.7]]}),terminate:()=>window.navigationFixture.terminated++})});
window.navigationFixture.controller=controller;
createRoot(document.getElementById('root')).render(<LocaleProvider><aside style={{padding:16,background:'#fff1bd'}}>LOCAL NAVIGATION FIXTURE — synthetic GPS/Worker geometry, NOT real walking directions.</aside><main style={{maxWidth:560,padding:20,margin:'auto'}}><NavigationPanel controller={controller} destination={destination} name="Labelled test place"/></main></LocaleProvider>);
