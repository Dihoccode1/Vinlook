import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PoiMap } from './features/map/PoiMap';
import { get_poi } from './services/pois';
import type { Poi } from './types/poi';
import { use_location } from './features/tracking/use-location';
import { LocationControls } from './features/tracking/LocationControls';
import { PoiImage } from './features/poi/PoiImage';
import { https_url } from './features/poi/image-url';
import { use_route_plan } from './features/navigation/use-route-plan';
import { RoutePlanner } from './features/navigation/RoutePlanner';
import { PoiTranslation } from './features/translation/PoiTranslation';
import { start_activity } from './services/activity';
import { MobileSheet, type MobileSheetHandle } from './features/layout/MobileSheet';
import { use_poi_discovery } from './features/poi/use-poi-discovery';

const categories: Record<string, string> = { market: 'Chợ', history: 'Lịch sử', architecture: 'Kiến trúc' };

export default function App() {
  const sheet = useRef<MobileSheetHandle>(null);
  useEffect(start_activity, []);
  const [search, set_search] = useState('');
  const [content_language, set_content_language] = useState('vi');
  const [category, set_category] = useState('');
  const [page, set_page] = useState(1);
  const [selected, set_selected] = useState<Poi | null>(null);
  const [detail, set_detail] = useState<Poi | null>(null);
  const [detail_error, set_detail_error] = useState('');
  const [retry, set_retry] = useState(0);
  const location = use_location();
  const has_gps = location.active && !location.stale && location.position !== null;
  const searching = search.trim().length > 0;
  const { all_pois: all_pois, matches, loading, error } = use_poi_discovery({ search, category, position: has_gps ? location.position : null }, retry);
  const total = matches.length;
  const page_count = Math.max(1, Math.ceil(total / 20));
  const current_page = Math.min(page, page_count);
  const visible_pois = matches.slice((current_page - 1) * 20, current_page * 20);
  const [view, set_view] = useState<'explore' | 'route'>('explore');
  const plan = use_route_plan(all_pois, location);
  const map_pois = useMemo(() => [...new Map([...all_pois, ...plan.stops].map(poi => [poi.id, poi])).values()], [all_pois, plan.stops]);
  const [following, set_following] = useState(false);
  const [location_focus, set_location_focus] = useState(0);
  const stop_following = useCallback(() => set_following(false), []);
  const select = useCallback((poi: Poi) => { set_following(false); set_selected(poi); sheet.current?.collapse(); }, []);
  const photo_poi = detail ?? selected;
  const photo_source = https_url(photo_poi?.image_source_url);
  const photo_license = https_url(photo_poi?.image_license_url);
  function locate() { set_selected(null); set_following(true); sheet.current?.collapse(); set_location_focus(value => value + 1); if (!location.active) location.start(); }

  useEffect(() => {
    set_selected(null);
    set_detail(null);
  }, [search, category]);
  useEffect(() => { set_page(previous => Math.min(previous, page_count)); }, [page_count]);

  useEffect(() => {
    set_detail(null);
    set_detail_error('');
    if (!selected) return;
    const controller = new AbortController();
    get_poi(selected.id, controller.signal).then(result => set_detail(result.data)).catch(() => {
      if (!controller.signal.aborted) set_detail_error('Không thể tải chi tiết địa điểm. Hãy chọn lại địa điểm.');
    });
    return () => controller.abort();
  }, [selected]);

  return <main className="app">
    <MobileSheet ref={sheet}>
      <header className="brand"><span className="brand-icon" aria-hidden="true">V</span><div><h1>vinlook<span>.</span></h1><p>ĐI ĐỂ HIỂU THÊM</p></div></header>
      <div className="view-tabs" role="group" aria-label="Chế độ bản đồ"><button aria-pressed={view === 'explore'} onClick={() => { set_view('explore'); sheet.current?.expand(); }}>Khám phá</button><button aria-pressed={view === 'route'} onClick={() => { set_view('route'); sheet.current?.expand(); }}>Lộ trình{plan.stops.length > 0 ? ` · ${plan.stops.length}` : ''}</button></div>
      {view === 'route' ? <RoutePlanner plan={plan} pois={all_pois} on_explore={() => { set_view('explore'); sheet.current?.expand(); }} on_show_route={() => { set_selected(null); set_following(false); sheet.current?.collapse(); }} on_calculate={() => { set_selected(null); set_following(false); sheet.current?.collapse(); void plan.calculate(); }} /> : <>
      <section className="intro"><span className="eyebrow">KHÁM PHÁ THÀNH PHỐ</span><h2><span className="intro-desktop">Mỗi nơi đến,<br />một câu chuyện.</span><span className="intro-mobile">Khám phá gần bạn</span></h2><p>Tìm những điểm dừng thú vị giữa lòng Sài Gòn.</p></section>
      <label className="search-label" htmlFor="search">Bạn muốn khám phá đâu?</label>
      <input id="search" type="search" placeholder="Tìm tên hoặc địa chỉ…" value={search} maxLength={200} onChange={event => { set_search(event.target.value); set_page(1); }} />
      <div className="filters" aria-label="Lọc danh mục">
        {Object.entries({ '': 'Tất cả', ...categories }).map(([value, label]) => <button key={value} aria-pressed={category === value} className={category === value ? 'active' : ''} onClick={() => { set_category(value); set_page(1); }}>{label}</button>)}
      </div>
      <div className="list-heading"><h3>{searching ? 'Kết quả tìm kiếm' : 'Địa điểm gần bạn'}</h3><span>{total} địa điểm</span></div>
      <p className="discovery-scope">{searching ? 'Tìm theo tên hoặc địa chỉ · Không giới hạn khoảng cách' : 'Trong bán kính 5 km · Khoảng cách đường chim bay'}</p>
      <div className="results" role="region" aria-label="Danh sách địa điểm" tabIndex={0} aria-live="polite" aria-busy={loading}>
        {loading ? <p className="state">Đang tải địa điểm…</p> : error ? <div className="state error" role="alert"><p>{error}</p><button onClick={() => set_retry(value => value + 1)}>Thử lại</button></div> : !searching && !has_gps ? <div className="state"><p>{location.status === 'locating' ? 'Đang chờ vị trí GPS để tìm địa điểm trong 5 km…' : location.stale ? 'Đang chờ GPS cập nhật. Bạn vẫn có thể tìm kiếm địa điểm bằng tên hoặc địa chỉ.' : 'Cho phép vị trí để xem địa điểm trong 5 km, hoặc nhập tên/địa chỉ để tìm kiếm.'}</p><button onClick={locate}>Về vị trí của tôi</button></div> : visible_pois.length === 0 ? <p className="state">{searching ? 'Chưa tìm thấy địa điểm phù hợp. Thử từ khóa khác nhé.' : 'Chưa có địa điểm phù hợp trong bán kính 5 km. Nhập tên hoặc địa chỉ để tìm xa hơn.'}</p> : visible_pois.map(({ poi, distance_meters: distance_meters }) => <button className={`poi-card ${selected?.id === poi.id ? 'selected' : ''}`} key={poi.id} onClick={() => select(poi)}>
          <PoiImage class_name="poi-list-photo" src={poi.image_url} name={poi.name} />
          <span className="poi-content"><span className="category">{categories[poi.category] ?? poi.category}</span><strong>{poi.name}</strong><span className="address">{poi.address}</span><span className={`poi-distance${distance_meters === null ? ' unavailable' : ''}`}>{distance_meters === null ? 'Cần GPS để tính khoảng cách' : `Cách bạn ${(distance_meters / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`}</span></span><span className="arrow" aria-hidden="true">↗</span>
        </button>)}
      </div>
      {total > 20 && <nav className="pagination" aria-label="Phân trang"><button disabled={current_page === 1 || loading} onClick={() => set_page(current_page - 1)}>Trước</button><span>Trang {current_page} / {page_count}</span><button disabled={current_page === page_count || loading} onClick={() => set_page(current_page + 1)}>Sau</button></nav>}
      </>}
      <footer>VINLOOK <span>Khởi đầu hành trình của bạn</span></footer>
    </MobileSheet>
    <section className="map-panel" aria-label="Khám phá trên bản đồ">
      <PoiMap pois={map_pois} selected={selected} on_select={select} position={location.position} stale={location.stale} following={following} location_focus={location_focus} on_manual_move={stop_following} route={plan.route} itinerary={plan.stops} profile={plan.profile} />
      <LocationControls {...location} on_locate={locate} />
      <div className="map-badge"><span className="live-dot" /> Thành phố Hồ Chí Minh <span className="badge-country">VIỆT NAM</span></div>
      {selected && <article className="detail photo-detail">
        <button className="close" aria-label="Đóng chi tiết" onClick={() => set_selected(null)}>×</button>
        <PoiImage class_name="poi-detail-photo" src={photo_poi?.image_url ?? null} name={selected.name} lazy={false} />
        <div className="detail-body"><span className="eyebrow">ĐIỂM DỪNG CỦA BẠN</span>
          {detail_error ? <p role="alert">{detail_error}</p> : detail ? <><PoiTranslation key={detail.id} poi={detail} language={content_language} on_language={set_content_language} /><span className="coordinates">{detail.latitude.toFixed(4)}° N · {detail.longitude.toFixed(4)}° E</span></> : <p aria-live="polite">Đang tải thông tin địa điểm…</p>}
          {photo_poi?.image_credit && <p className="photo-credit">Ảnh: {photo_source ? <a href={photo_source} target="_blank" rel="noopener noreferrer">{photo_poi.image_credit}</a> : photo_poi.image_credit}{photo_license && <> · <a href={photo_license} target="_blank" rel="noopener noreferrer">Giấy phép</a></>}</p>}
          <div className="poi-route-actions"><button onClick={() => { set_following(false); plan.add_stop(selected, true); set_view('route'); set_selected(null); sheet.current?.collapse(); }}>Chỉ đường tới đây</button><button disabled={plan.stops.some(poi => poi.id === selected.id) || plan.stops.length >= 9} onClick={() => { set_following(false); plan.add_stop(selected); set_view('route'); set_selected(null); sheet.current?.collapse(); }}>Thêm vào lộ trình</button></div>
        </div>
      </article>}
    </section>
  </main>;
}
