import {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  useEffect,
  useSyncExternalStore,
} from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { createLocaleStore } from './state.js';
import { createUiI18n } from './instance.js';
const Context = createContext(null);
export function LocaleProvider({ children, store: providedStore }) {
  const [store] = useState(
    () => providedStore ?? createLocaleStore({ online: globalThis.navigator?.onLine !== false }),
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [i18n] = useState(() => createUiI18n(state.locale));
  // Synchronous bundled resources; fixed translator prevents text/dir mismatch on a locale transition.
  useLayoutEffect(() => {
    void i18n.changeLanguage(state.locale);
    document.documentElement.lang = state.locale;
    document.documentElement.dir = state.direction;
  }, [i18n, state.locale, state.direction]);
  useEffect(() => {
    const offline = () => store.setConnectivity('offline'),
      online = () => store.setConnectivity('online');
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [store]);
  return (
    <Context
      value={{
        ...state,
        setLocale: store.setLocale,
        setConnectivity: store.setConnectivity,
        dismissReconnect: store.dismissReconnect,
        subscribeLocaleChange: store.subscribeLocaleChange,
      }}
    >
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </Context>
  );
}
export function useLocale() {
  const value = useContext(Context);
  if (!value) throw new Error('LOCALE_PROVIDER_REQUIRED');
  return value;
}
export function useTouristTranslation() {
  const locale = useLocale();
  const { i18n } = useTranslation();
  return i18n.getFixedT(locale.locale);
}
export function StaffLanguageBoundary({ children }) {
  const [i18n] = useState(() => createUiI18n('en'));
  const parent = useContext(Context);
  const value = {
    ...parent,
    locale: 'en',
    direction: 'ltr',
    resourceVersion: 'ui-v1',
    setLocale: (code) => {
      if (code !== 'en') throw new Error('STAFF_LOCALE_FIXED');
    },
  };
  return (
    <Context value={value}>
      <I18nextProvider i18n={i18n}>
        <div lang="en" dir="ltr">
          {children}
        </div>
      </I18nextProvider>
    </Context>
  );
}
export function GeographyBoundary({ children, ...props }) {
  return (
    <div
      {...props}
      dir="ltr"
      className={['geography-boundary', props.className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
