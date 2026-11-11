import { useEffect, useRef, useState } from 'react';
import type { Poi } from '../../types';
import { Icon } from '../../components/Icon';
import { categories } from '../../services/api';
import './narration-dialog.css';

export function PoiNarrationDialog({ poi, on_close }: { poi: Poi; on_close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLAudioElement>(null);
  const request = useRef<AbortController | null>(null);
  const audio_url = useRef<string | null>(null);
  const [languages, set_languages] = useState<{ code: string; name: string }[]>([]);
  const [language, set_language] = useState(poi.source_language);
  const [src, set_src] = useState('');
  const [loading, set_loading] = useState(false);
  const [error, set_error] = useState('');
  const [image_failed, set_image_failed] = useState(false);

  function clear_audio() {
    request.current?.abort();
    player.current?.pause();
    if (audio_url.current) URL.revokeObjectURL(audio_url.current);
    audio_url.current = null;
  }

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    const controller = new AbortController();
    dialog.current?.showModal();
    document.body.style.overflow = 'hidden';
    fetch('/api/languages', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error('Không tải được danh sách ngôn ngữ. Hãy mở lại cửa sổ để thử lại.');
        return response.json();
      })
      .then((result) => {
        if (!controller.signal.aborted) set_languages(result.data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) set_error(failure.message);
      });
    return () => {
      controller.abort();
      clear_audio();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  async function prepare_audio() {
    if (loading) return;
    clear_audio();
    set_src('');
    set_error('');
    set_loading(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch(`/api/pois/${encodeURIComponent(poi.id)}/narration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json();
        const messages: Record<string, string> = {
          PROVIDER_QUOTA: 'Chưa có audio lưu sẵn và dịch vụ đã hết hạn mức. Vui lòng thử lại sau.',
          PROVIDER_NOT_CONFIGURED: 'Dịch vụ giọng đọc chưa được cấu hình.',
          PROVIDER_BUSY: 'Dịch vụ đang bận. Vui lòng thử lại sau.',
          POI_NOT_FOUND: 'Địa điểm chưa được xuất bản nên chưa thể nghe thử.',
        };
        throw new Error(messages[body.error?.code] ?? 'Không tải được audio. Vui lòng thử lại.');
      }
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      audio_url.current = URL.createObjectURL(blob);
      set_src(audio_url.current);
    } catch (failure) {
      if (!controller.signal.aborted)
        set_error(failure instanceof Error ? failure.message : 'Không tải được audio.');
    } finally {
      if (!controller.signal.aborted) set_loading(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="narration-dialog"
      aria-labelledby="preview-title"
      onCancel={on_close}
    >
      <header className="preview-hero">
        {poi.image_url && !image_failed ? (
          <img
            className="preview-photo"
            src={poi.image_url}
            alt={poi.name}
            onError={() => set_image_failed(true)}
          />
        ) : (
          <div className="preview-photo-placeholder">
            <Icon kind="photo" size={64} />
          </div>
        )}
        <div className="preview-hero-shade" />
        <span className="preview-tag">
          <Icon kind="listen" size={14} /> NGHE THỬ THUYẾT MINH
        </span>
        <button
          className="preview-close"
          type="button"
          aria-label="Đóng nghe thử"
          onClick={on_close}
        >
          <Icon kind="close" size={20} />
        </button>
        <div className="preview-place">
          <span>{categories[poi.category] ?? poi.category}</span>
          <h2 id="preview-title">{poi.name}</h2>
        </div>
      </header>
      <div className="preview-body">
        <p className="preview-address">
          <Icon kind="pin" size={16} />
          <span>{poi.address}</span>
        </p>
        {poi.image_credit && <small className="preview-credit">Ảnh: {poi.image_credit}</small>}
        <section className="preview-audio-card" aria-label="Nghe thử mẫu">
          <div className="preview-section-title">
            <span className="preview-listen-icon">
              <Icon kind="listen" size={22} />
            </span>
            <div>
              <h3>Nghe câu chuyện nơi đây</h3>
              <p>Chọn ngôn ngữ để nghe thử bài thuyết minh.</p>
            </div>
          </div>
          <label>
            Ngôn ngữ thuyết minh
            <select
              value={language}
              onChange={(event) => {
                clear_audio();
                set_src('');
                set_loading(false);
                set_error('');
                set_language(event.target.value);
              }}
            >
              {!languages.length && (
                <option value={poi.source_language}>
                  {poi.source_language === 'vi' ? 'Tiếng Việt' : poi.source_language}
                </option>
              )}
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                  {item.code === poi.source_language ? ' · Bản gốc' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary"
            disabled={loading}
            onClick={() => void prepare_audio()}
          >
            {loading ? 'Đang chuẩn bị audio…' : src ? 'Tải lại audio' : '▶ Nghe thử mẫu'}
          </button>
          {loading && <p role="status">Lần tạo đầu tiên có thể mất một chút thời gian.</p>}
          {src && (
            <>
              <audio
                ref={player}
                src={src}
                controls
                autoPlay
                onError={() => set_error('Không phát được audio. Vui lòng tải lại.')}
              />
              <small>Nhấn nút phát nếu trình duyệt chưa tự phát âm thanh.</small>
            </>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
        </section>
        <div className="preview-note">
          <Icon kind="check" size={15} />
          <span>Ưu tiên audio đã lưu. Bản mới sẽ tự động được lưu cho lần nghe sau.</span>
        </div>
      </div>
    </dialog>
  );
}
