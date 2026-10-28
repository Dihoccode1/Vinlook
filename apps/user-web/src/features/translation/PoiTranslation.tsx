import { useEffect, useState } from 'react';
import type { Poi } from '../../types/poi';
import { NarrationPlayer } from './NarrationPlayer';

type Result = { data: { name: string; description: string; language: string; provider: string }; fromCache: boolean; original: boolean };
export function PoiTranslation({ poi, language, onLanguage }: { poi: Poi; language: string; onLanguage: (value: string) => void }) {
  const [languages, setLanguages] = useState<{code: string; name: string}[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/languages', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      setLanguages((await response.json()).data);
    }).catch(() => { if (!controller.signal.aborted) setError('Không thể tải ngôn ngữ. Hãy thử lại.'); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    setResult(null); setError('');
    if (language === poi.sourceLanguage) return;
    const controller = new AbortController();
    fetch(`/api/pois/${encodeURIComponent(poi.id)}/translation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language }), signal: controller.signal,
    }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.code === 'PROVIDER_NOT_CONFIGURED' ? 'Dịch vụ dịch chưa được cấu hình. Vui lòng thử lại sau.' : body.error?.code === 'PROVIDER_QUOTA' ? 'API dịch đã hết hạn mức. Hãy thử lại sau.' : 'Chưa dịch được nội dung. Hãy thử lại.');
      if (!controller.signal.aborted) setResult(body);
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Không thể dịch.'); });
    return () => controller.abort();
  }, [poi.id, poi.name, poi.description, poi.sourceLanguage, language, retry]);
  const translated = result?.data.language === language ? result : null;
  const pending = language !== poi.sourceLanguage && !translated && !error;
  return <section className="poi-translation" aria-busy={pending}>
    <NarrationPlayer poiId={poi.id} text={`${translated?.data.name ?? poi.name}. ${translated?.data.description ?? poi.description}`} language={language} disabled={language !== poi.sourceLanguage && !translated} languageControl={<label className="narration-language">Ngôn ngữ <select aria-label="Ngôn ngữ câu chuyện" value={language} onChange={event => onLanguage(event.target.value)}>
      {!languages.length && <option value={poi.sourceLanguage}>Bản gốc</option>}
      {languages.map(item => <option key={item.code} value={item.code}>{item.name}{item.code === poi.sourceLanguage ? ' · Bản gốc' : ''}</option>)}
    </select></label>} />
    <div>
      <h2 lang={translated ? language : poi.sourceLanguage} dir={translated && language === 'ar' ? 'rtl' : 'auto'}>{translated?.data.name ?? poi.name}</h2>
      <div className="visitor-information" lang={poi.sourceLanguage}><h3>Thông tin địa điểm</h3>
        {poi.visitorDescription?.trim() && <p>{poi.visitorDescription}</p>}
        <dl><div><dt>Loại địa điểm</dt><dd>{{ market: 'Chợ & mua sắm', history: 'Lịch sử & bảo tàng', architecture: 'Kiến trúc & văn hóa' }[poi.category] ?? 'Điểm tham quan'}</dd></div><div><dt>Địa chỉ</dt><dd>{poi.address}</dd></div></dl>
      </div>
    </div>
    {pending && <small role="status">Đang chuẩn bị nội dung thuyết minh cho ngôn ngữ đã chọn…</small>}
    {error && <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Thử lại</button></p>}
  </section>;
}
