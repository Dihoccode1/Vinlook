import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PoiMap } from './features/map/PoiMap';
import { getPoi } from './services/pois';
import type { Poi } from './types/poi';
import { useLocation } from './features/tracking/use-location';
import { LocationControls } from './features/tracking/LocationControls';
import { PoiImage } from './features/poi/PoiImage';
import { httpsUrl } from './features/poi/image-url';
import { useRoutePlan } from './features/navigation/use-route-plan';
import { RoutePlanner } from './features/navigation/RoutePlanner';
import { PoiTranslation } from './features/translation/PoiTranslation';
import { startActivity } from './services/activity';
import { MobileSheet, type MobileSheetHandle } from './features/layout/MobileSheet';
import { usePoiDiscovery } from './features/poi/use-poi-discovery';

const categories: Record<string, string> = { market: 'Chợ', history: 'Lịch sử', architecture: 'Kiến trúc' };

export default function App() {
  const sheet = useRef<MobileSheetHandle>(null);
  useEffect(startActivity, []);
  const [search, setSearch] = useState('');
  const [contentLanguage, setContentLanguage] = useState('vi');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [detail, setDetail] = useState<Poi | null>(null);
  const [detailError, setDetailError] = useState('');
  const [retry, setRetry] = useState(0);
  const location = useLocation();
  const hasGps = location.active && !location.stale && location.position !== null;
  const searching = search.trim().length > 0;
  const { allPois, matches, loading, error } = usePoiDiscovery({ search, category, position: hasGps ? location.position : null }, retry);
  const total = matches.length;
  const pageCount = Math.max(1, Math.ceil(total / 20));
  const currentPage = Math.min(page, pageCount);
  const visiblePois = matches.slice((currentPage - 1) * 20, currentPage * 20);
  const [view, setView] = useState<'explore' | 'route'>('explore');
  const plan = useRoutePlan(allPois, location);
  const mapPois = useMemo(() => [...new Map([...allPois, ...plan.stops].map(poi => [poi.id, poi])).values()], [allPois, plan.stops]);
  const [following, setFollowing] = useState(false);
  const [locationFocus, setLocationFocus] = useState(0);
  const stopFollowing = useCallback(() => setFollowing(false), []);
  const select = useCallback((poi: Poi) => { setFollowing(false); setSelected(poi); sheet.current?.collapse(); }, []);
  const photoPoi = detail ?? selected;
  const photoSource = httpsUrl(photoPoi?.imageSourceUrl);
  const photoLicense = httpsUrl(photoPoi?.imageLicenseUrl);
  function locate() { setSelected(null); setFollowing(true); sheet.current?.collapse(); setLocationFocus(value => value + 1); if (!location.active) location.start(); }

  useEffect(() => {
    setSelected(null);
    setDetail(null);
  }, [search, category]);
  useEffect(() => { setPage(previous => Math.min(previous, pageCount)); }, [pageCount]);

  useEffect(() => {
    setDetail(null);
    setDetailError('');
    if (!selected) return;
    const controller = new AbortController();
    getPoi(selected.id, controller.signal).then(result => setDetail(result.data)).catch(() => {
      if (!controller.signal.aborted) setDetailError('Không thể tải chi tiết địa điểm. Hãy chọn lại địa điểm.');
    });
    return () => controller.abort();
  }, [selected]);

  return <main className="app">
    <MobileSheet ref={sheet}>
      <header className="brand"><span className="brand-icon" aria-hidden="true">V</span><div><h1>vinlook<span>.</span></h1><p>ĐI ĐỂ HIỂU THÊM</p></div></header>
      <div className="view-tabs" role="group" aria-label="Chế độ bản đồ"><button aria-pressed={view === 'explore'} onClick={() => { setView('explore'); sheet.current?.expand(); }}>Khám phá</button><button aria-pressed={view === 'route'} onClick={() => { setView('route'); sheet.current?.expand(); }}>Lộ trình{plan.stops.length > 0 ? ` · ${plan.stops.length}` : ''}</button></div>
      {view === 'route' ? <RoutePlanner plan={plan} pois={allPois} onExplore={() => { setView('explore'); sheet.current?.expand(); }} onShowRoute={() => { setSelected(null); setFollowing(false); sheet.current?.collapse(); }} onCalculate={() => { setSelected(null); setFollowing(false); sheet.current?.collapse(); void plan.calculate(); }} /> : <>
      <section className="intro"><span className="eyebrow">KHÁM PHÁ THÀNH PHỐ</span><h2>Mỗi nơi đến,<br />một câu chuyện.</h2><p>Tìm những điểm dừng thú vị giữa lòng Sài Gòn.</p></section>
      <label className="search-label" htmlFor="search">Bạn muốn khám phá đâu?</label>
      <input id="search" type="search" placeholder="Tìm tên hoặc địa chỉ…" value={search} maxLength={200} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <div className="filters" aria-label="Lọc danh mục">
        {Object.entries({ '': 'Tất cả', ...categories }).map(([value, label]) => <button key={value} aria-pressed={category === value} className={category === value ? 'active' : ''} onClick={() => { setCategory(value); setPage(1); }}>{label}</button>)}
      </div>
      <div className="list-heading"><h3>{searching ? 'Kết quả tìm kiếm' : 'Địa điểm gần bạn'}</h3><span>{total} địa điểm</span></div>
      <p className="discovery-scope">{searching ? 'Tìm theo tên hoặc địa chỉ · Không giới hạn khoảng cách' : 'Trong bán kính 5 km · Khoảng cách đường chim bay'}</p>
      <div className="results" aria-live="polite" aria-busy={loading}>
        {loading ? <p className="state">Đang tải địa điểm…</p> : error ? <div className="state error" role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : !searching && !hasGps ? <div className="state"><p>{location.status === 'locating' ? 'Đang chờ vị trí GPS để tìm địa điểm trong 5 km…' : location.stale ? 'Đang chờ GPS cập nhật. Bạn vẫn có thể tìm kiếm địa điểm bằng tên hoặc địa chỉ.' : 'Cho phép vị trí để xem địa điểm trong 5 km, hoặc nhập tên/địa chỉ để tìm kiếm.'}</p><button onClick={locate}>Về vị trí của tôi</button></div> : visiblePois.length === 0 ? <p className="state">{searching ? 'Chưa tìm thấy địa điểm phù hợp. Thử từ khóa khác nhé.' : 'Chưa có địa điểm phù hợp trong bán kính 5 km. Nhập tên hoặc địa chỉ để tìm xa hơn.'}</p> : visiblePois.map(({ poi, distanceMeters }) => <button className={`poi-card ${selected?.id === poi.id ? 'selected' : ''}`} key={poi.id} onClick={() => select(poi)}>
          <PoiImage className="poi-list-photo" src={poi.imageUrl} name={poi.name} />
          <span className="poi-content"><span className="category">{categories[poi.category] ?? poi.category}</span><strong>{poi.name}</strong><span className="address">{poi.address}</span><span className={`poi-distance${distanceMeters === null ? ' unavailable' : ''}`}>{distanceMeters === null ? 'Cần GPS để tính khoảng cách' : `Cách bạn ${(distanceMeters / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`}</span></span><span className="arrow" aria-hidden="true">↗</span>
        </button>)}
      </div>
      {total > 20 && <nav className="pagination" aria-label="Phân trang"><button disabled={currentPage === 1 || loading} onClick={() => setPage(currentPage - 1)}>Trước</button><span>Trang {currentPage} / {pageCount}</span><button disabled={currentPage === pageCount || loading} onClick={() => setPage(currentPage + 1)}>Sau</button></nav>}
      </>}
      <footer>VINLOOK <span>Khởi đầu hành trình của bạn</span></footer>
    </MobileSheet>
    <section className="map-panel" aria-label="Khám phá trên bản đồ">
      <PoiMap pois={mapPois} selected={selected} onSelect={select} position={location.position} stale={location.stale} following={following} locationFocus={locationFocus} onManualMove={stopFollowing} route={plan.route} itinerary={plan.stops} profile={plan.profile} />
      <LocationControls {...location} onLocate={locate} />
      <div className="map-badge"><span className="live-dot" /> Thành phố Hồ Chí Minh <span className="badge-country">VIỆT NAM</span></div>
      {selected && <article className="detail photo-detail">
        <button className="close" aria-label="Đóng chi tiết" onClick={() => setSelected(null)}>×</button>
        <PoiImage className="poi-detail-photo" src={photoPoi?.imageUrl ?? null} name={selected.name} lazy={false} />
        <div className="detail-body"><span className="eyebrow">ĐIỂM DỪNG CỦA BẠN</span>
          {detailError ? <p role="alert">{detailError}</p> : detail ? <><PoiTranslation key={detail.id} poi={detail} language={contentLanguage} onLanguage={setContentLanguage} /><span className="coordinates">{detail.latitude.toFixed(4)}° N · {detail.longitude.toFixed(4)}° E</span></> : <p aria-live="polite">Đang tải thông tin địa điểm…</p>}
          {photoPoi?.imageCredit && <p className="photo-credit">Ảnh: {photoSource ? <a href={photoSource} target="_blank" rel="noopener noreferrer">{photoPoi.imageCredit}</a> : photoPoi.imageCredit}{photoLicense && <> · <a href={photoLicense} target="_blank" rel="noopener noreferrer">Giấy phép</a></>}</p>}
          <div className="poi-route-actions"><button onClick={() => { setFollowing(false); plan.addStop(selected, true); setView('route'); setSelected(null); sheet.current?.collapse(); }}>Chỉ đường tới đây</button><button disabled={plan.stops.some(poi => poi.id === selected.id) || plan.stops.length >= 9} onClick={() => { setFollowing(false); plan.addStop(selected); setView('route'); setSelected(null); sheet.current?.collapse(); }}>Thêm vào lộ trình</button></div>
        </div>
      </article>}
    </section>
  </main>;
}
