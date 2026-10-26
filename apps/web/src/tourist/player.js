// One controller/media element per tab. Creating/selecting a POI never calls play.
export function createPlayer({ media, telemetry, onChange = () => {} }) {
  let item = null,
    state = 'idle',
    generation = 0;
  const emit = () => onChange({ state, item });
  const close = (reason = 'closed') => {
    generation++;
    media.pause();
    media.removeAttribute('src');
    media.load();
    if (item) telemetry.end(reason);
    item = null;
    state = 'idle';
    emit();
  };
  const ended = () => {
    if (item) {
      telemetry.end('completed');
      state = 'ended';
      emit();
    }
  };
  const failed = () => {
    if (item) {
      telemetry.end('closed');
      state = 'error';
      emit();
    }
  };
  media.addEventListener('ended', ended);
  media.addEventListener('error', failed);
  return {
    async play(next) {
      if (state === 'loading') return;
      const resume =
        state === 'paused' && item?.id === next.id && item?.languageCode === next.languageCode;
      if (!resume) {
        close('replaced');
        item = next;
        media.src = next.audio.url;
        telemetry.start(next.id, next.languageCode);
      }
      const attempt = ++generation;
      state = 'loading';
      emit();
      try {
        await media.play();
        if (attempt === generation) {
          state = 'playing';
          emit();
        }
      } catch {
        if (attempt === generation) {
          telemetry.end('closed');
          state = 'error';
          emit();
        }
      }
    },
    pause() {
      if (state === 'playing') {
        media.pause();
        state = 'paused';
        emit();
      }
    },
    close,
    localeChanged(locale) {
      if (item && item.languageCode !== locale) close();
    },
    dispose() {
      close('page_closed');
      media.removeEventListener('ended', ended);
      media.removeEventListener('error', failed);
    },
  };
}
