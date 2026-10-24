import {LanguageSelector} from './i18n/LanguageSelector.jsx';
import {useTouristTranslation} from './i18n/provider.jsx';
export function App() {
  const t=useTouristTranslation();
  return <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 px-6 py-12">
    <p className="text-sm font-semibold uppercase tracking-widest text-primary">Vinlook</p>
    <LanguageSelector />
    <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t('preview.title')}</h1>
    <p className="text-lg leading-relaxed text-muted-foreground">{t('preview.subtitle')}</p>
    <section aria-labelledby="status-heading" className="rounded-xl border border-border bg-card p-5">
      <h2 id="status-heading" className="font-semibold">{t('preview.statusTitle')}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('preview.statusBody')}</p>
    </section>
  </main>;
}
