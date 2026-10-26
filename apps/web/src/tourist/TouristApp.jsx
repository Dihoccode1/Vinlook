import { MiniPlayer } from './components/MiniPlayer.jsx';
import { PlaceDetails } from './components/PlaceDetails.jsx';
import { Picture } from './components/Picture.jsx';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTouristPlayback } from './useTouristPlayback.js';
import { useNearbyLocation } from './useNearbyLocation.js';
import { useTouristCatalog } from './useTouristCatalog.js';
import { usePoiDetail } from './usePoiDetail.js';
import { createTouristNavigation } from '../navigation/runtime.js';
import { LanguageSelector } from '../i18n/LanguageSelector.jsx';
import { useLocale, useTouristTranslation } from '../i18n/provider.jsx';
import { formatTime } from './catalog.js';
import { touristCopy } from './copy.js';
const NativeMap = lazy(() => import('./MapView.jsx').then((m) => ({ default: m.MapView })));
function DefaultMap(props) {
  return props.styleUrl ? (
    <Suspense fallback={<p role="status">…</p>}>
      <NativeMap {...props} />
    </Suspense>
  ) : (
    <div className="tour-map">
      <div className="map-source-note" role="status">
        <span aria-hidden="true">◇</span>
        <p>{props.labels.mapMissing}</p>
      </div>
    </div>
  );
}

export function TouristApp({
  content,
  mapStyleUrl = null,
  usage = null,
  routing = null,
  MapComponent = DefaultMap,
}) {
  const t = useTouristTranslation(),
    locale = useLocale(),
    copy = touristCopy(locale.locale);
  const [query, setQuery] = useState(''),
    [mode, setMode] = useState('all');
  const [reload, setReload] = useState(0),
    [selectedId, setSelectedId] = useState(null);
  const { player, playback, time } = useTouristPlayback(usage, locale.locale);
  const { position, gpsStatus, locate: requestLocation } = useNearbyLocation(locale.locale);
  const { page, status, more } = useTouristCatalog(content, locale.locale, {
    query,
    mode,
    position,
    reload,
  });
  const { detail, detailStatus } = usePoiDetail(content, selectedId, locale.locale, reload);
  const locate = () =>
    requestLocation(() => {
      setQuery('');
      setMode('nearby');
    });
  const [navigationState, setNavigationState] = useState(null);
  const navigation = useMemo(
    () => (routing ? createTouristNavigation(routing, setNavigationState) : null),
    [routing],
  );
  useEffect(() => () => navigation?.stop(), [navigation]);
  const stateText =
    status === 'configuration'
      ? copy.contentMissing
      : status === 'error'
        ? copy.connectError
        : status === 'loading'
          ? t('common.loading')
          : t('map.foundCount', { count: page.items.length });
  return (
    <main className={'tour-shell' + (playback.item ? ' has-player' : '')}>
      <header className="tour-header">
        <a href="/" className="tour-brand" aria-label="Vinlook">
          <span className="brand-mark" aria-hidden="true">
            v<span>↗</span>
          </span>
          vinlook<span className="brand-dot">.</span>
        </a>
        <span className="city-caption">Ho Chi Minh City</span>
        <div className="header-language">
          <LanguageSelector />
        </div>
      </header>
      <div className="tour-workspace">
        <section className="tour-sidebar" aria-label={copy.list}>
          <div className="tour-intro">
            <p className="tour-eyebrow">{copy.guides}</p>
            <h1>{t('preview.title')}</h1>
            <p>{t('preview.subtitle')}</p>
          </div>
          <form className="tour-search" onSubmit={(e) => e.preventDefault()} role="search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label={copy.search}
              placeholder={copy.search}
              value={query}
              maxLength={200}
              onChange={(e) => {
                setQuery(e.target.value);
                setMode('all');
              }}
            />
            {query && (
              <button type="button" aria-label={t('common.close')} onClick={() => setQuery('')}>
                ×
              </button>
            )}
          </form>
          <div className="tour-filters">
            <button
              className={mode === 'all' ? 'active' : ''}
              onClick={() => {
                setMode('all');
                setQuery('');
              }}
            >
              {copy.all}
            </button>
            <button
              className={mode === 'nearby' ? 'active' : ''}
              onClick={locate}
              disabled={gpsStatus === 'loading'}
            >
              <span aria-hidden="true">◎ </span>
              {t('map.nearby')}
            </button>
          </div>
          {['denied', 'unavailable'].includes(gpsStatus) && (
            <p role="status" className="tour-notice">
              {t(gpsStatus === 'denied' ? 'map.locationDenied' : 'map.locationUnavailable')}
            </p>
          )}
          {locale.mode === 'offline' && (
            <p className="tour-notice" role="status">
              {copy.offline} · {t('offline.unavailable')}
            </p>
          )}
          <div className="catalog-heading">
            <h2>{mode === 'nearby' ? t('map.nearby') : copy.all}</h2>
            <p role="status" data-testid="catalog-status">
              {stateText}
            </p>
          </div>
          {(status === 'error' || status === 'configuration') && (
            <button className="tour-retry" onClick={() => setReload((x) => x + 1)}>
              {t('common.retry')}
            </button>
          )}
          {status === 'ready' && page.items.length === 0 && (
            <div className="tour-empty">
              <span aria-hidden="true">◇</span>
              <h3>{mode === 'nearby' ? t('map.noNearby') : copy.empty}</h3>
              <p>{copy.emptyBody}</p>
            </div>
          )}
          <ul className="tour-place-list" data-content-locale={page.items[0]?.languageCode ?? ''}>
            {page.items.map((item, index) => (
              <li key={item.id}>
                <button
                  className={'tour-place' + (selectedId === item.id ? ' selected' : '')}
                  onClick={() => setSelectedId(item.id)}
                  aria-label={`${copy.view}: ${item.nameEN}`}
                  aria-pressed={selectedId === item.id}
                >
                  <Picture className="place-picture" src={item.thumbnail.url} alt="" />
                  <span className="place-info">
                    <span className="place-index">
                      {String(index + 1).padStart(2, '0')} ·{' '}
                      {formatTime(item.audio.durationSeconds)}
                    </span>
                    <strong>{item.nameEN}</strong>
                    <span className="place-action">{t('poi.details')} ↗</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {page.nextCursor && (
            <button
              className="tour-retry"
              onClick={() => void more()}
              disabled={status !== 'ready'}
            >
              {status === 'more' ? t('common.loading') : copy.more}
            </button>
          )}
          <footer className="tour-list-footer">
            <span className="status-dot" aria-hidden="true" /> {copy.guides} · Vinlook ·{' '}
            <a href="/credits/photos.html" lang="en">
              Photo credits
            </a>
          </footer>
        </section>
        <section className="tour-map-panel" aria-label={t('map.title')}>
          <MapComponent
            styleUrl={mapStyleUrl}
            items={page.items}
            selectedId={selectedId}
            position={
              navigationState?.latestFix
                ? {
                    lon: navigationState.latestFix.position[0],
                    lat: navigationState.latestFix.position[1],
                  }
                : position
            }
            route={navigationState?.route?.geometry ?? null}
            onSelect={setSelectedId}
            labels={{
              ...copy,
              map: t('map.title'),
              error: t('common.error'),
              retry: t('common.retry'),
            }}
          />
          <div className="map-caption" dir="ltr">
            <span className="status-dot" /> HO CHI MINH CITY <span>10.7769° N · 106.7009° E</span>
          </div>
          <button
            className="locate-control"
            onClick={locate}
            disabled={gpsStatus === 'loading'}
            aria-label={t('map.locateMe')}
          >
            ◎
          </button>
          {selectedId && (
            <PlaceDetails
              copy={copy}
              detail={detail}
              detailStatus={detailStatus}
              navigation={navigation}
              player={player}
              routing={routing}
              setReload={setReload}
              setSelectedId={setSelectedId}
              t={t}
            />
          )}
        </section>
      </div>
      {playback.item && (
        <MiniPlayer copy={copy} playback={playback} player={player} t={t} time={time} />
      )}
    </main>
  );
}
