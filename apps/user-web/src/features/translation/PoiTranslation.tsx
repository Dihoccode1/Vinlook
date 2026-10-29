import { useEffect, useState } from 'react';
import type { Poi } from '../../types/poi';
import { NarrationPlayer } from './NarrationPlayer';

type Result = { data: { name: string; description: string; language: string; provider: string }; from_cache: boolean; original: boolean };
export function PoiTranslation({ poi, language, on_language: on_language }: { poi: Poi; language: string; on_language: (value: string) => void }) {
  const [languages, set_languages] = useState<{code: string; name: string}[]>([]);
  const [result, set_result] = useState<Result | null>(null);
  const [error, set_error] = useState('');
  const [retry, set_retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/languages', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      set_languages((await response.json()).data);
    }).catch(() => { if (!controller.signal.aborted) set_error('Không thể tải ngôn ngữ. Hãy thử lại.'); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    set_result(null); set_error('');
    if (language === poi.source_language) return;
    const controller = new AbortController();
    fetch(`/api/pois/${encodeURIComponent(poi.id)}/translation`, {
      method: 'POST', headers: { 'content-Type': 'application/json' }, body: JSON.stringify({ language }), signal: controller.signal,
    }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.code === 'PROVIDER_NOT_CONFIGURED' ? 'Dịch vụ dịch chưa được cấu hình. Vui lòng thử lại sau.' : body.error?.code === 'PROVIDER_QUOTA' ? 'API dịch đã hết hạn mức. Hãy thử lại sau.' : 'Chưa dịch được nội dung. Hãy thử lại.');
      if (!controller.signal.aborted) set_result(body);
    }).catch((failure: unknown) => { if (!controller.signal.aborted) set_error(failure instanceof Error ? failure.message : 'Không thể dịch.'); });
    return () => controller.abort();
  }, [poi.id, poi.name, poi.description, poi.source_language, language, retry]);
  const translated = result?.data.language === language ? result : null;
  const pending = language !== poi.source_language && !translated && !error;
  return <section className="poi-translation" aria-busy={pending}>
    <NarrationPlayer poi_id={poi.id} text={`${translated?.data.name ?? poi.name}. ${translated?.data.description ?? poi.description}`} language={language} disabled={language !== poi.source_language && !translated} language_control={<label className="narration-language">Ngôn ngữ <select aria-label="Ngôn ngữ câu chuyện" value={language} onChange={event => on_language(event.target.value)}>
      {!languages.length && <option value={poi.source_language}>Bản gốc</option>}
      {languages.map(item => <option key={item.code} value={item.code}>{item.name}{item.code === poi.source_language ? ' · Bản gốc' : ''}</option>)}
    </select></label>} />
    <div>
      <h2 lang={translated ? language : poi.source_language} dir={translated && language === 'ar' ? 'rtl' : 'auto'}>{translated?.data.name ?? poi.name}</h2>
      <div className="visitor-information" lang={poi.source_language}><h3>Thông tin địa điểm</h3>
        {poi.visitor_description?.trim() && <p>{poi.visitor_description}</p>}
        <dl><div><dt>Loại địa điểm</dt><dd>{{ market: 'Chợ & mua sắm', history: 'Lịch sử & bảo tàng', architecture: 'Kiến trúc & văn hóa' }[poi.category] ?? 'Điểm tham quan'}</dd></div><div><dt>Địa chỉ</dt><dd>{poi.address}</dd></div></dl>
      </div>
    </div>
    {pending && <small role="status">Đang chuẩn bị nội dung thuyết minh cho ngôn ngữ đã chọn…</small>}
    {error && <p role="alert">{error} <button onClick={() => set_retry(value => value + 1)}>Thử lại</button></p>}
  </section>;
}
