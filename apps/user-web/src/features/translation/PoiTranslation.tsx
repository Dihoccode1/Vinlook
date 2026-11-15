import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { Label } from '@vinlook/ui/label';
import { Select } from '@vinlook/ui/select';
import type { Poi } from '../../types/poi';
import { NarrationPlayer } from './NarrationPlayer';

type Result = {
  data: { name: string; description: string; language: string; provider: string };
  from_cache: boolean;
  original: boolean;
};

export function PoiTranslation({
  poi,
  language,
  on_language: on_language,
}: {
  poi: Poi;
  language: string;
  on_language: (value: string) => void;
}) {
  const [languages, set_languages] = useState<{ code: string; name: string }[]>([]);
  const [result, set_result] = useState<Result | null>(null);
  const [error, set_error] = useState('');
  const [retry, set_retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/languages', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        set_languages((await response.json()).data);
      })
      .catch(() => {
        if (!controller.signal.aborted) set_error('Không thể tải ngôn ngữ. Hãy thử lại.');
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    set_result(null);
    set_error('');
    if (language === poi.source_language) return;
    const controller = new AbortController();
    fetch(`/api/pois/${encodeURIComponent(poi.id)}/translation`, {
      method: 'POST',
      headers: { 'content-Type': 'application/json' },
      body: JSON.stringify({ language }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.code === 'PROVIDER_NOT_CONFIGURED'
              ? 'Dịch vụ dịch chưa được cấu hình. Vui lòng thử lại sau.'
              : body.error?.code === 'PROVIDER_QUOTA'
                ? 'API dịch đã hết hạn mức. Hãy thử lại sau.'
                : 'Chưa dịch được nội dung. Hãy thử lại.',
          );
        if (!controller.signal.aborted) set_result(body);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          set_error(failure instanceof Error ? failure.message : 'Không thể dịch.');
      });
    return () => controller.abort();
  }, [poi.id, poi.name, poi.description, poi.source_language, language, retry]);

  const translated = result?.data.language === language ? result : null;
  const pending = language !== poi.source_language && !translated && !error;
  return (
    <section className="mt-3" aria-busy={pending}>
      <NarrationPlayer
        poi_id={poi.id}
        text={`${translated?.data.name ?? poi.name}. ${translated?.data.description ?? poi.description}`}
        language={language}
        disabled={language !== poi.source_language && !translated}
        language_control={
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="poi-narration-lang"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Ngôn ngữ
            </Label>
            <Select
              id="poi-narration-lang"
              aria-label="Ngôn ngữ câu chuyện"
              value={language}
              onChange={(event) => on_language(event.target.value)}
              className="h-9 min-w-[165px] rounded-lg border-[#cfd9c6] bg-white text-xs font-medium"
            >
              {!languages.length && <option value={poi.source_language}>Bản gốc</option>}
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                  {item.code === poi.source_language ? ' · Bản gốc' : ''}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="mt-4">
        <h2
          className="mt-2.5 mr-6 mb-3 text-[22px] font-bold tracking-tight text-foreground"
          lang={translated ? language : poi.source_language}
          dir={translated && language === 'ar' ? 'rtl' : 'auto'}
        >
          {translated?.data.name ?? poi.name}
        </h2>
        <div className="my-3 mb-4" lang={poi.source_language}>
          <h3 className="mb-2 text-[13px] font-semibold text-[#45634f]">Thông tin địa điểm</h3>
          {poi.visitor_description?.trim() && (
            <p className="mb-3.5 text-xs leading-[1.9] whitespace-pre-line text-[#6b796c]">
              {poi.visitor_description}
            </p>
          )}
          <dl className="grid gap-2.5 border-t border-[#e2e7da] pt-3">
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5 text-xs leading-[1.7] max-[760px]:grid-cols-[88px_minmax(0,1fr)]">
              <dt className="text-[#82917d]">Loại địa điểm</dt>
              <dd className="m-0 text-[#38553f]">
                {{
                  market: 'Chợ & mua sắm',
                  history: 'Lịch sử & bảo tàng',
                  architecture: 'Kiến trúc & văn hóa',
                }[poi.category] ?? 'Điểm tham quan'}
              </dd>
            </div>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5 text-xs leading-[1.7] max-[760px]:grid-cols-[88px_minmax(0,1fr)]">
              <dt className="text-[#82917d]">Địa chỉ</dt>
              <dd className="m-0 text-[#38553f]">{poi.address}</dd>
            </div>
          </dl>
        </div>
      </div>

      {pending && (
        <small
          className="mt-2 block text-[10px] leading-relaxed text-muted-foreground"
          role="status"
        >
          Đang chuẩn bị nội dung thuyết minh cho ngôn ngữ đã chọn…
        </small>
      )}
      {error && (
        <Alert variant="destructive" className="mt-3 items-center justify-between">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="xs" onClick={() => set_retry((value) => value + 1)}>
            Thử lại
          </Button>
        </Alert>
      )}
    </section>
  );
}
