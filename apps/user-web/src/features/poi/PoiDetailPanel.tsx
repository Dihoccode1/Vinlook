import { Button } from '@vinlook/ui/button';
import { PoiImage } from './PoiImage';
import { PoiTranslation } from '../translation/PoiTranslation';
import type { useExplorePage } from '../../hooks/useExplorePage';

type Props = Pick<
  ReturnType<typeof useExplorePage>,
  | 'sheet'
  | 'content_language'
  | 'set_content_language'
  | 'selected'
  | 'set_selected'
  | 'detail'
  | 'detail_error'
  | 'set_view'
  | 'plan'
  | 'set_following'
  | 'photo_poi'
  | 'photo_source'
  | 'photo_license'
>;

export function PoiDetailPanel({
  sheet,
  content_language,
  set_content_language,
  selected,
  set_selected,
  detail,
  detail_error,
  set_view,
  plan,
  set_following,
  photo_poi,
  photo_source,
  photo_license,
}: Props) {
  if (!selected) return null;
  return (
    <article className="poi-detail-sheet absolute right-[75px] bottom-[30px] left-[25px] z-[450] max-h-[calc(100%-100px)] max-w-[480px] overflow-auto rounded-[15px] border border-[#e2e5d8] bg-[#fffef9] shadow-[0_12px_40px_#12302120]">
      <button
        type="button"
        aria-label="Đóng chi tiết"
        onClick={() => set_selected(null)}
        className="absolute top-3.5 right-4 z-[1] grid size-7 place-items-center rounded-full bg-[#fffffff0] text-xl leading-none text-[#344c3f] shadow-xs transition-colors hover:bg-white"
      >
        ×
      </button>
      <PoiImage
        class_name="block h-[155px] w-full max-[760px]:h-[100px]"
        src={photo_poi?.image_url ?? null}
        name={selected.name}
        lazy={false}
      />
      <div className="p-6 py-5 max-[760px]:p-[15px]">
        <span className="text-[10px] font-medium tracking-[1.6px] text-muted-foreground uppercase">
          ĐIỂM DỪNG CỦA BẠN
        </span>
        {detail_error ? (
          <p className="mt-2.5 text-xs leading-relaxed text-destructive" role="alert">
            {detail_error}
          </p>
        ) : detail ? (
          <>
            <PoiTranslation
              key={detail.id}
              poi={detail}
              language={content_language}
              on_language={set_content_language}
            />
            <span className="mt-2 block text-[9px] tracking-[1px] text-[#9b9f8f]">
              {detail.latitude.toFixed(4)}° N · {detail.longitude.toFixed(4)}° E
            </span>
          </>
        ) : (
          <p className="mt-2.5 text-xs leading-[1.9] text-[#6b796c]" aria-live="polite">
            Đang tải thông tin địa điểm…
          </p>
        )}
        {photo_poi?.image_credit && (
          <p className="mt-3 text-[9px] leading-[1.7] text-[#84907b]">
            Ảnh:{' '}
            {photo_source ? (
              <a
                href={photo_source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {photo_poi.image_credit}
              </a>
            ) : (
              photo_poi.image_credit
            )}
            {photo_license && (
              <>
                {' '}
                ·{' '}
                <a
                  href={photo_license}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Giấy phép
                </a>
              </>
            )}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              set_following(false);
              plan.add_stop(selected, true);
              set_view('route');
              set_selected(null);
              sheet.current?.collapse();
            }}
            className="h-auto rounded-lg px-[13px] py-[11px] text-[10px]"
          >
            Chỉ đường tới đây
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={plan.stops.some((poi) => poi.id === selected.id) || plan.stops.length >= 9}
            onClick={() => {
              set_following(false);
              plan.add_stop(selected);
              set_view('route');
              set_selected(null);
              sheet.current?.collapse();
            }}
            className="h-auto rounded-lg border-[#cfd9c6] bg-white px-[13px] py-[11px] text-[10px] text-primary"
          >
            Thêm vào lộ trình
          </Button>
        </div>
      </div>
    </article>
  );
}
