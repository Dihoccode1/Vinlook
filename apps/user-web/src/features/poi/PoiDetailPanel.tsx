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
    <>
      <article className="detail photo-detail">
        <button className="close" aria-label="Đóng chi tiết" onClick={() => set_selected(null)}>
          ×
        </button>
        <PoiImage
          class_name="poi-detail-photo"
          src={photo_poi?.image_url ?? null}
          name={selected.name}
          lazy={false}
        />
        <div className="detail-body">
          <span className="eyebrow">ĐIỂM DỪNG CỦA BẠN</span>
          {detail_error ? (
            <p role="alert">{detail_error}</p>
          ) : detail ? (
            <>
              <PoiTranslation
                key={detail.id}
                poi={detail}
                language={content_language}
                on_language={set_content_language}
              />
              <span className="coordinates">
                {detail.latitude.toFixed(4)}° N · {detail.longitude.toFixed(4)}° E
              </span>
            </>
          ) : (
            <p aria-live="polite">Đang tải thông tin địa điểm…</p>
          )}
          {photo_poi?.image_credit && (
            <p className="photo-credit">
              Ảnh:{' '}
              {photo_source ? (
                <a href={photo_source} target="_blank" rel="noopener noreferrer">
                  {photo_poi.image_credit}
                </a>
              ) : (
                photo_poi.image_credit
              )}
              {photo_license && (
                <>
                  ·{' '}
                  <a href={photo_license} target="_blank" rel="noopener noreferrer">
                    Giấy phép
                  </a>
                </>
              )}
            </p>
          )}
          <div className="poi-route-actions">
            <button
              onClick={() => {
                set_following(false);
                plan.add_stop(selected, true);
                set_view('route');
                set_selected(null);
                sheet.current?.collapse();
              }}
            >
              Chỉ đường tới đây
            </button>
            <button
              disabled={plan.stops.some((poi) => poi.id === selected.id) || plan.stops.length >= 9}
              onClick={() => {
                set_following(false);
                plan.add_stop(selected);
                set_view('route');
                set_selected(null);
                sheet.current?.collapse();
              }}
            >
              Thêm vào lộ trình
            </button>
          </div>
        </div>
      </article>
    </>
  );
}
