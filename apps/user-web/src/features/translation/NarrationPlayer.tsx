import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@vinlook/ui/button';
import { set_listening } from '../../services/activity';

export function NarrationPlayer({
  poi_id: poi_id,
  text,
  language,
  disabled,
  language_control: language_control,
}: {
  poi_id: string;
  text: string;
  language: string;
  disabled: boolean;
  language_control: ReactNode;
}) {
  const [state, set_state] = useState<'idle' | 'loading' | 'ready' | 'playing' | 'paused'>('idle');
  const [error, set_error] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const object_url = useRef<string | null>(null);
  const activity_id = useRef(crypto.randomUUID());

  useEffect(() => {
    set_state('idle');
    set_error('');
    return () => {
      set_listening(activity_id.current, false);
      controller.current?.abort();
      controller.current = null;
      if (audio.current) {
        audio.current.onplaying = null;
        audio.current.onpause = null;
        audio.current.onended = null;
        audio.current.onerror = null;
        audio.current.pause();
        audio.current.removeAttribute('src');
        audio.current.load();
        audio.current = null;
      }
      if (object_url.current) URL.revokeObjectURL(object_url.current);
      object_url.current = null;
    };
  }, [poi_id, text, language, disabled]);

  async function play() {
    if (disabled || state === 'loading') return;
    if (state === 'playing') {
      audio.current?.pause();
      set_state('paused');
      return;
    }
    set_error('');
    const request = new AbortController();
    controller.current = request;
    try {
      if (!audio.current) {
        set_state('loading');
        const response = await fetch(`/api/pois/${encodeURIComponent(poi_id)}/narration`, {
          method: 'POST',
          headers: { 'content-Type': 'application/json' },
          body: JSON.stringify({ language }),
          signal: request.signal,
        });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(
            body.error?.code === 'PROVIDER_NOT_CONFIGURED'
              ? 'Dịch vụ giọng đọc chưa được cấu hình hoặc chưa có quyền truy cập. Vui lòng thử lại sau.'
              : body.error?.code === 'PROVIDER_QUOTA'
                ? 'Ngôn ngữ này chưa có audio lưu sẵn. Dịch vụ tạo giọng đọc đã hết hạn mức, vui lòng thử lại sau.'
                : body.error?.code === 'PROVIDER_BUSY'
                  ? 'Đang tạo các bài thuyết minh khác. Vui lòng thử lại sau ít phút.'
                  : 'Không thể tạo thuyết minh. Vui lòng thử lại.',
          );
        }
        const blob = await response.blob();
        if (request.signal.aborted) return;
        object_url.current = URL.createObjectURL(blob);
        const player = new Audio(object_url.current);
        audio.current = player;
        player.onplaying = () => {
          set_listening(activity_id.current, true);
          set_state('playing');
        };
        player.onpause = () => {
          set_listening(activity_id.current, false);
          set_state((previous) => (previous === 'playing' ? 'paused' : previous));
        };
        player.onended = () => {
          set_listening(activity_id.current, false);
          set_state('ready');
        };
        player.onerror = () => {
          set_listening(activity_id.current, false);
          set_state('ready');
          set_error('Không phát được âm thanh. Vui lòng thử lại.');
        };
      }
      await audio.current!.play();
      if (!request.signal.aborted) set_state('playing');
    } catch (failure) {
      if (request.signal.aborted) return;
      set_state(audio.current ? 'ready' : 'idle');
      set_error(
        failure instanceof DOMException && failure.name === 'NotAllowedError'
          ? 'Âm thanh đã sẵn sàng. Nhấn nghe lần nữa để phát.'
          : failure instanceof Error
            ? failure.message
            : 'Không thể tải thuyết minh.',
      );
    }
  }

  function stop() {
    controller.current?.abort();
    if (audio.current) {
      audio.current.pause();
      audio.current.currentTime = 0;
    }
    set_state(audio.current ? 'ready' : 'idle');
    set_error('');
  }

  return (
    <section
      className="rounded-xl border border-[#dce4d4] bg-gradient-to-br from-[#eff6e8] to-[#fff8e9] p-3.5"
      aria-label="Thuyết minh địa điểm"
      aria-busy={state === 'loading'}
    >
      <div className="flex flex-wrap items-end gap-2.5">
        <Button
          disabled={disabled || state === 'loading'}
          onClick={() => void play()}
          className="min-h-10 flex-1 rounded-[10px] px-4 text-xs font-semibold"
        >
          {state === 'loading'
            ? 'Đang tạo giọng đọc…'
            : state === 'playing'
              ? '⏸ Tạm dừng'
              : state === 'paused'
                ? '▶ Tiếp tục'
                : '▶ Nghe thuyết minh'}
        </Button>
        {language_control}
        {['loading', 'playing', 'paused'].includes(state) && (
          <Button variant="outline" size="sm" onClick={stop} className="rounded-lg bg-white">
            Dừng
          </Button>
        )}
      </div>
      <small className="mt-2.5 block text-[10px] leading-[1.6] text-[#6d7c6a]" role="status">
        {state === 'loading'
          ? 'Đang chuẩn bị câu chuyện cho bạn. Lần đầu có thể cần chờ một chút.'
          : disabled
            ? 'Chờ bản dịch để nghe theo ngôn ngữ đã chọn.'
            : 'Chọn ngôn ngữ rồi nhấn “Nghe thuyết minh” để khám phá câu chuyện nơi đây.'}
      </small>
      <small className="mt-1 block text-[10px] leading-[1.6] text-[#83917f]">
        Giọng thuyết minh được tạo bằng AI
      </small>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
