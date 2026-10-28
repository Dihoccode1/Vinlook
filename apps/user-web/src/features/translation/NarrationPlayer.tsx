import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { setListening } from '../../services/activity';

export function NarrationPlayer({ poiId, text, language, disabled, languageControl }: { poiId: string; text: string; language: string; disabled: boolean; languageControl: ReactNode }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'playing' | 'paused'>('idle');
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  const activityId = useRef(crypto.randomUUID());
  useEffect(() => {
    setState('idle'); setError('');
    return () => {
      setListening(activityId.current, false);
      controller.current?.abort(); controller.current = null;
      if (audio.current) { audio.current.onplaying = null; audio.current.onpause = null; audio.current.onended = null; audio.current.onerror = null; audio.current.pause(); audio.current.removeAttribute('src'); audio.current.load(); audio.current = null; }
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    };
  }, [poiId, text, language, disabled]);
  async function play() {
    if (disabled || state === 'loading') return;
    if (state === 'playing') { audio.current?.pause(); setState('paused'); return; }
    setError('');
    const request = new AbortController(); controller.current = request;
    try {
      if (!audio.current) {
        setState('loading');
        const response = await fetch(`/api/pois/${encodeURIComponent(poiId)}/narration`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language }), signal: request.signal,
        });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error?.code === 'PROVIDER_NOT_CONFIGURED' ? 'Dịch vụ giọng đọc chưa được cấu hình hoặc chưa có quyền truy cập. Vui lòng thử lại sau.' : body.error?.code === 'PROVIDER_QUOTA' ? 'Ngôn ngữ này chưa có audio lưu sẵn. Dịch vụ tạo giọng đọc đã hết hạn mức, vui lòng thử lại sau.' : body.error?.code === 'PROVIDER_BUSY' ? 'Đang tạo các bài thuyết minh khác. Vui lòng thử lại sau ít phút.' : 'Không thể tạo thuyết minh. Vui lòng thử lại.');
        }
        const blob = await response.blob();
        if (request.signal.aborted) return;
        objectUrl.current = URL.createObjectURL(blob);
        const player = new Audio(objectUrl.current); audio.current = player;
        player.onplaying = () => { setListening(activityId.current,true); setState('playing'); };
        player.onpause = () => { setListening(activityId.current,false); setState(previous=>previous==='playing'?'paused':previous); };
        player.onended = () => { setListening(activityId.current,false); setState('ready'); };
        player.onerror = () => { setListening(activityId.current,false); setState('ready'); setError('Không phát được âm thanh. Vui lòng thử lại.'); };
      }
      await audio.current!.play();
      if (!request.signal.aborted) setState('playing');
    } catch (failure) {
      if (request.signal.aborted) return;
      setState(audio.current ? 'ready' : 'idle');
      setError(failure instanceof DOMException && failure.name === 'NotAllowedError' ? 'Âm thanh đã sẵn sàng. Nhấn nghe lần nữa để phát.' : failure instanceof Error ? failure.message : 'Không thể tải thuyết minh.');
    }
  }
  function stop() {
    controller.current?.abort();
    if (audio.current) { audio.current.pause(); audio.current.currentTime = 0; }
    setState(audio.current ? 'ready' : 'idle'); setError('');
  }
  return <section className="narration-player" aria-label="Thuyết minh địa điểm" aria-busy={state === 'loading'}>
    <div className="narration-actions">
      <button className="narration-play" disabled={disabled || state === 'loading'} onClick={() => void play()}>
        {state === 'loading' ? 'Đang tạo giọng đọc…' : state === 'playing' ? '⏸ Tạm dừng' : state === 'paused' ? '▶ Tiếp tục' : '▶ Nghe thuyết minh'}
      </button>
      {languageControl}
      {['loading', 'playing', 'paused'].includes(state) && <button className="narration-stop" onClick={stop}>Dừng</button>}
    </div>
    <small role="status">{state === 'loading' ? 'Đang chuẩn bị câu chuyện cho bạn. Lần đầu có thể cần chờ một chút.' : disabled ? 'Chờ bản dịch để nghe theo ngôn ngữ đã chọn.' : 'Chọn ngôn ngữ rồi nhấn “Nghe thuyết minh” để khám phá câu chuyện nơi đây.'}</small>
    <small>Giọng thuyết minh được tạo bằng AI</small>
    {error && <p role="alert">{error}</p>}
  </section>;
}
