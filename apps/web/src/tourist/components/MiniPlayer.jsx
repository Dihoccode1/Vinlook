import { formatTime } from '../catalog.js';
import { Picture } from './Picture.jsx';
export function MiniPlayer({ copy, playback, player, t, time }) {
  return (
    <section className="tour-mini-player" aria-label={copy.guides}>
      <div className="mini-title">
        <Picture className="mini-picture" src={playback.item.thumbnail?.url} alt="" />
        <div>
          <strong>{playback.item.nameEN}</strong>
          <span>
            {playback.item.languageCode} · {copy.guides}
          </span>
        </div>
      </div>
      <div className="mini-controls">
        <button
          className="mini-skip"
          aria-label="−10 s"
          disabled={!['playing', 'paused'].includes(playback.state)}
          onClick={() => player.current?.seekBy(-10)}
        >
          <span aria-hidden="true">↶</span>
          <span>10s</span>
        </button>
        <button
          className="mini-play"
          disabled={playback.state === 'loading'}
          aria-label={t(playback.state === 'playing' ? 'audio.pause' : 'audio.play')}
          onClick={() =>
            playback.state === 'playing'
              ? player.current?.pause()
              : void player.current?.play(playback.item)
          }
        >
          {playback.state === 'loading' ? '…' : playback.state === 'playing' ? 'Ⅱ' : '▶'}
        </button>
        <button
          className="mini-skip"
          aria-label="+10 s"
          disabled={!['playing', 'paused'].includes(playback.state)}
          onClick={() => player.current?.seekBy(10)}
        >
          <span aria-hidden="true">↷</span>
          <span>10s</span>
        </button>
      </div>
      <div className="mini-progress">
        <progress aria-label={copy.guides} value={time} max={playback.item.audio.durationSeconds} />
        <span dir="ltr">
          {formatTime(time)} / {formatTime(playback.item.audio.durationSeconds)}
        </span>
      </div>
      <button
        className="mini-close"
        aria-label={t('common.close')}
        onClick={() => player.current?.close()}
      >
        ×
      </button>
      {playback.state === 'error' && <p role="alert">{t('audio.unavailable')}</p>}
    </section>
  );
}
