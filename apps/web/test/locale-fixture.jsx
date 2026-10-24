// Test-only Vite entry; not a route/control in the production build.
import {createRoot} from 'react-dom/client';
import {useTranslation} from 'react-i18next';
import {LocaleProvider,StaffLanguageBoundary,GeographyBoundary,useTouristTranslation} from '../src/i18n/provider.jsx';
import {createLocaleStore} from '../src/i18n/state.js';
import {App} from '../src/App.jsx';
import '../src/styles.css';
const store=createLocaleStore();let audioStopped=0;
store.subscribeLocaleChange(e=>{if(e.reason==='offline'&&e.previousLocale!=='en')audioStopped++;});
window.localeFixture={setLocale:store.setLocale,setConnectivity:store.setConnectivity,snapshot:store.getSnapshot,audioStopped:()=>audioStopped};
function StaffProbe(){const {t}=useTranslation();const scoped=useTouristTranslation();return <p data-testid="staff">{t('common.retry')} / {scoped('common.retry')}</p>;}
function MixedText(){const t=useTouristTranslation();return <p data-testid="mixed">{t('poi.details')}: <bdi lang="vi">Dinh Độc Lập</bdi> <bdi dir="ltr">106.7, 10.78</bdi></p>;}
createRoot(document.getElementById('root')).render(<LocaleProvider store={store}><App/><StaffLanguageBoundary><StaffProbe/></StaffLanguageBoundary><GeographyBoundary data-testid="geometry"><svg width="200" height="80" viewBox="0 0 200 80" aria-label="Synthetic geometry"><path d="M10 60 L170 20" stroke="blue" fill="none"/><text x="10" y="75">106.7, 10.78</text></svg></GeographyBoundary><MixedText/></LocaleProvider>);
