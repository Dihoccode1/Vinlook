import {locales} from './locales.js';
import {useLocale,useTouristTranslation} from './provider.jsx';
export function LanguageSelector(){
 const {locale,mode,setLocale,reconnectNotice,dismissReconnect,announcement}=useLocale(),t=useTouristTranslation();
 const notice=mode==='offline'?'offline-notice':reconnectNotice?'reconnect-notice':undefined;
 return <section className="language-control">
  <label htmlFor="tourist-language" className="text-sm font-semibold">{t('language.label')}</label>
  <select id="tourist-language" value={locale} onChange={e=>setLocale(e.target.value)} aria-describedby={notice} className="language-select">
   {locales.map(l=><option key={l.code} value={l.code} lang={l.code} dir={l.direction} disabled={mode==='offline'&&l.code!=='en'}>{l.name}</option>)}
  </select>
  {mode==='offline'&&<p id="offline-notice" className="text-sm text-muted-foreground">{t('language.englishOnlyOffline')}</p>}
  {reconnectNotice&&<div id="reconnect-notice" className="text-sm text-muted-foreground"><p>{t('language.reconnectEnglish')}</p><button type="button" onClick={dismissReconnect} className="mt-2 underline">{t('common.close')}</button></div>}
  <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement==='changed'?t('language.changed'):announcement==='offline'?t('language.englishOnlyOffline'):announcement==='reconnected'?t('language.reconnectEnglish'):''}</p>
 </section>;
}
