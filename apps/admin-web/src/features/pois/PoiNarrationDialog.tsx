import { NativeDialog } from '@vinlook/ui/dialog';
import { NativeSelect } from '@vinlook/ui/native-select';
import { Button } from '@vinlook/ui/button';
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
    <NativeDialog
      ref={dialog}
      className="narration-dialog w-[min(580px,_calc(100%_-_32px))] max-h-[calc(100dvh_-_48px)] p-[0] text-[#214337] overflow-y-auto shadow-[0_28px_100px_#102d3555] [@media(max-width:_600px)]:w-[calc(100%_-_24px)] [@media(max-width:_600px)]:max-h-[calc(100dvh_-_32px)]"
      aria-labelledby="preview-title"
      onCancel={on_close}
    >
      <header className="preview-hero relative min-h-[244px] flex items-end bg-[#355b48] [@media(max-width:_600px)]:min-h-[205px]">
        {poi.image_url && !image_failed ? (
          <img
            className="preview-photo absolute w-full h-full object-cover"
            src={poi.image_url}
            alt={poi.name}
            onError={() => set_image_failed(true)}
          />
        ) : (
          <div className="preview-photo-placeholder absolute w-full h-full grid text-[#b4c7a5]">
            <Icon kind="photo" size={64} />
          </div>
        )}
        <div className="preview-hero-shade absolute w-full h-full" />
        <span className="preview-tag absolute top-[22px] left-[24px] flex gap-[7px] items-center text-[9px] font-semibold tracking-[1.4px] text-white bg-[#173f348c] py-[9px] px-[11px] [@media(max-width:_600px)]:top-[17px] [@media(max-width:_600px)]:left-[18px] [@media(max-width:_600px)]:text-[8px] [@media(max-width:_600px)]:tracking-[1px] [@media(max-width:_600px)]:py-[8px] [@media(max-width:_600px)]:px-[9px]">
          <Icon kind="listen" size={14} /> NGHE THỬ THUYẾT MINH
        </span>
        <Button
          variant="custom"
          className="preview-close"
          type="button"
          aria-label="Đóng nghe thử"
          onClick={on_close}
        >
          <Icon kind="close" size={20} />
        </Button>
        <div className="preview-place relative w-full text-[white]">
          <span>{categories[poi.category] ?? poi.category}</span>
          <h2 id="preview-title">{poi.name}</h2>
        </div>
      </header>
      <div className="preview-body flex flex-col gap-[13px] [@media(max-width:_600px)]:gap-[12px]">
        <p className="preview-address">
          <Icon kind="pin" size={16} />
          <span>{poi.address}</span>
        </p>
        {poi.image_credit && (
          <small className="preview-credit text-[9px] text-[#86937e] mt-[-7px]">
            Ảnh: {poi.image_credit}
          </small>
        )}
        <section
          className="preview-audio-card flex flex-col gap-[17px] p-[21px] bg-[white] [@media(max-width:_600px)]:p-[16px] [@media(max-width:_600px)]:gap-[15px]"
          aria-label="Nghe thử mẫu"
        >
          <div className="preview-section-title flex items-center gap-[12px] [@media(max-width:_600px)]:gap-[10px]">
            <span className="preview-listen-icon grid shrink-0 w-[44px] h-[44px] bg-[#edf3e7] text-[#356045] rounded-[13px]">
              <Icon kind="listen" size={22} />
            </span>
            <div>
              <h3>Nghe câu chuyện nơi đây</h3>
              <p>Chọn ngôn ngữ để nghe thử bài thuyết minh.</p>
            </div>
          </div>
          <label>
            Ngôn ngữ thuyết minh
            <NativeSelect
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
            </NativeSelect>
          </label>
          <Button
            variant="custom"
            type="button"
            className="primary"
            disabled={loading}
            onClick={() => void prepare_audio()}
          >
            {loading ? 'Đang chuẩn bị audio…' : src ? 'Tải lại audio' : '▶ Nghe thử mẫu'}
          </Button>
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
            <div
              className="error-banner py-[13px] px-[15px] bg-[#fff0e8] text-[#a65d40] rounded-[8px]"
              role="alert"
            >
              {error}
            </div>
          )}
        </section>
        <div className="preview-note flex items-start gap-[7px] text-[10px] leading-[1.7] text-[#87937d]">
          <Icon kind="check" size={15} />
          <span>Ưu tiên audio đã lưu. Bản mới sẽ tự động được lưu cho lần nghe sau.</span>
        </div>
      </div>
    </NativeDialog>
  );
}
