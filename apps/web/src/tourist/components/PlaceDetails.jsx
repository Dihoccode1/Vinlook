import { formatTime } from '../catalog.js';
import { NavigationPanel } from '../../navigation/NavigationPanel.jsx';
import { Picture } from './Picture.jsx';
export function PlaceDetails({
  copy,
  detail,
  detailStatus,
  navigation,
  player,
  routing,
  setReload,
  setSelectedId,
  t,
}) {
  return (
    <section className="poi-detail" aria-label={t('poi.details')}>
      <button
        className="detail-close"
        aria-label={t('common.close')}
        onClick={() => setSelectedId(null)}
      >
        ×
      </button>
      {detailStatus === 'loading' && <p role="status">{t('common.loading')}</p>}
      {detailStatus === 'error' && (
        <div role="alert">
          <p>{copy.connectError}</p>
          <button onClick={() => setReload((x) => x + 1)}>{t('common.retry')}</button>
        </div>
      )}
      {detail && (
        <>
          <Picture className="detail-picture" src={detail.thumbnail.url} alt={detail.nameEN} />
          <div className="detail-body">
            <p className="tour-eyebrow">
              {copy.guides} · {formatTime(detail.audio.durationSeconds)}
            </p>
            <h2>{detail.nameEN}</h2>
            <button className="listen-button" onClick={() => void player.current?.play(detail)}>
              ▶ {t('audio.play')}
            </button>
            <NavigationPanel
              controller={navigation}
              destination={
                routing
                  ? {
                      poiId: detail.id,
                      revisionId: detail.revisionId,
                      graphVersion: routing.graphVersion,
                      entrance: detail.entrance.coordinates,
                    }
                  : null
              }
              name={detail.nameEN}
            />
            <h3>{t('poi.description')}</h3>
            <p className="detail-text">{detail.text}</p>
          </div>
        </>
      )}
    </section>
  );
}
