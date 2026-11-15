import { useEffect, useRef, useState } from 'react';
import { Alert } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@vinlook/ui/dialog';
import { Select } from '@vinlook/ui/select';
import type { Poi } from '../../types';
import { Icon } from '../../components/Icon';
import { categories } from '../../services/api';

export function PoiNarrationDialog({ poi, on_close }: { poi: Poi; on_close: () => void }) {
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
    const controller = new AbortController();
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) on_close();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-labelledby="preview-title"
        className="w-[min(94vw,490px)] max-w-[490px] gap-0 overflow-hidden rounded-[22px] border-[#dfe6d9] bg-white p-0 shadow-[0_24px_60px_#14332638]"
      >
        <DialogDescription className="sr-only">
          Nghe thử audio thuyết minh theo ngôn ngữ cho {poi.name}
        </DialogDescription>
        <header className="relative h-[220px] overflow-hidden bg-[#174636]">
          {poi.image_url && !image_failed ? (
            <img
              className="h-full w-full object-cover"
              src={poi.image_url}
              alt={poi.name}
              onError={() => set_image_failed(true)}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_top_right,#3b785f,#153d2f)] text-[#b6cdb9]">
              <Icon kind="photo" size={64} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#174234]/25 via-[#153e30]/55 to-[#102e24]/90" />
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[10px] font-semibold tracking-[1.2px] text-white backdrop-blur-sm">
            <Icon kind="listen" size={14} /> NGHE THỬ THUYẾT MINH
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white text-[#233d32] shadow-sm hover:bg-[#f5f7f3]"
            type="button"
            aria-label="Đóng nghe thử"
            onClick={on_close}
          >
            <Icon kind="close" size={20} />
          </Button>
          <div className="absolute inset-x-6 bottom-5 text-white">
            <span className="block text-[11px] font-medium text-[#d3e2d4]">
              {categories[poi.category] ?? poi.category}
            </span>
            <DialogTitle
              id="preview-title"
              className="mt-1 text-xl leading-tight font-semibold text-white sm:text-2xl"
            >
              {poi.name}
            </DialogTitle>
          </div>
        </header>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-1">
            <p className="m-0 flex items-start gap-2 text-xs leading-relaxed text-[#5c6f59]">
              <Icon kind="pin" size={16} className="mt-0.5 shrink-0 text-[#7d9276]" />
              <span>{poi.address}</span>
            </p>
            {poi.image_credit && (
              <small className="block pl-6 text-[11px] text-[#8d9986]">
                Ảnh: {poi.image_credit}
              </small>
            )}
          </div>
          <section
            className="space-y-4 rounded-2xl border border-[#e3e9dd] bg-[#fcfdf9] p-4 sm:p-5"
            aria-label="Nghe thử mẫu"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3e6] text-[#557855]">
                <Icon kind="listen" size={22} />
              </span>
              <div>
                <h3 className="m-0 text-sm font-semibold text-[#1e3a2e]">
                  Nghe câu chuyện nơi đây
                </h3>
                <p className="m-0 text-xs text-[#7c8b74]">
                  Chọn ngôn ngữ để nghe thử bài thuyết minh.
                </p>
              </div>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
              <span>Ngôn ngữ thuyết minh</span>
              <Select
                value={language}
                onChange={(event) => {
                  clear_audio();
                  set_src('');
                  set_loading(false);
                  set_error('');
                  set_language(event.target.value);
                }}
                className="h-11 rounded-xl border-[#d6e0d2] bg-white text-sm"
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
              </Select>
            </label>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void prepare_audio()}
              className="h-11 w-full rounded-xl text-sm font-semibold"
            >
              {loading ? 'Đang chuẩn bị audio…' : src ? 'Tải lại audio' : '▶ Nghe thử mẫu'}
            </Button>
            {loading && (
              <p role="status" className="m-0 text-center text-xs text-[#6f826c]">
                Lần tạo đầu tiên có thể mất một chút thời gian.
              </p>
            )}
            {src && (
              <div className="space-y-1.5">
                <audio
                  ref={player}
                  src={src}
                  controls
                  autoPlay
                  className="w-full"
                  onError={() => set_error('Không phát được audio. Vui lòng tải lại.')}
                />
                <small className="block text-[11px] text-[#7c8b74]">
                  Nhấn nút phát nếu trình duyệt chưa tự phát âm thanh.
                </small>
              </div>
            )}
            {error && (
              <Alert variant="destructive" role="alert" className="text-xs leading-relaxed">
                {error}
              </Alert>
            )}
          </section>
          <div className="flex items-start gap-2 text-[11px] text-[#83927d]">
            <Icon kind="check" size={15} className="mt-0.5 shrink-0 text-[#5d8259]" />
            <span>Ưu tiên audio đã lưu. Bản mới sẽ tự động được lưu cho lần nghe sau.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
