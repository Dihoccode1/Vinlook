import { useCallback, useEffect, useState } from 'react';
import { PoiMap } from './features/map/PoiMap';
import { getPoi, listPois } from './services/pois';
import type { Poi } from './types/poi';

const categories: Record<string, string> = { market: 'Chợ', history: 'Lịch sử', architecture: 'Kiến trúc' };

export default function App() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pois, setPois] = useState<Poi[]>([]);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [detail, setDetail] = useState<Poi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [retry, setRetry] = useState(0);
  const select = useCallback((poi: Poi) => setSelected(poi), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setSelected(null);
    setDetail(null);
    setPois([]);
    setTotal(0);
    const timer = setTimeout(() => {
      listPois(search, category, page, controller.signal).then(result => {
        setPois(result.data);
        setTotal(result.pagination.total);
      }).catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Có lỗi xảy ra.');
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, category, page, retry]);

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
    <aside className="sidebar">
      <header className="brand"><span className="brand-icon" aria-hidden="true">V</span><div><h1>vinlook<span>.</span></h1><p>ĐI ĐỂ HIỂU THÊM</p></div></header>
      <section className="intro"><span className="eyebrow">KHÁM PHÁ THÀNH PHỐ</span><h2>Mỗi nơi đến,<br />một câu chuyện.</h2><p>Tìm những điểm dừng thú vị giữa lòng Sài Gòn.</p></section>
      <label className="search-label" htmlFor="search">Bạn muốn khám phá đâu?</label>
      <input id="search" type="search" placeholder="Tìm tên hoặc địa chỉ…" value={search} maxLength={200} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <div className="filters" aria-label="Lọc danh mục">
        {Object.entries({ '': 'Tất cả', ...categories }).map(([value, label]) => <button key={value} aria-pressed={category === value} className={category === value ? 'active' : ''} onClick={() => { setCategory(value); setPage(1); }}>{label}</button>)}
      </div>
      <div className="list-heading"><h3>Địa điểm khám phá</h3><span>{total} địa điểm</span></div>
      <div className="results" aria-live="polite" aria-busy={loading}>
        {loading ? <p className="state">Đang tìm địa điểm…</p> : error ? <div className="state error" role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : pois.length === 0 ? <p className="state">Chưa tìm thấy địa điểm phù hợp. Thử từ khóa khác nhé.</p> : pois.map((poi, index) => <button className={`poi-card ${selected?.id === poi.id ? 'selected' : ''}`} key={poi.id} onClick={() => select(poi)}>
          <span className="poi-number">{String((page - 1) * 20 + index + 1).padStart(2, '0')}</span>
          <span className="poi-content"><span className="category">{categories[poi.category] ?? poi.category}</span><strong>{poi.name}</strong><span className="address">{poi.address}</span></span><span className="arrow" aria-hidden="true">↗</span>
        </button>)}
      </div>
      {total > 20 && <nav className="pagination" aria-label="Phân trang"><button disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Trước</button><span>Trang {page} / {Math.ceil(total / 20)}</span><button disabled={page * 20 >= total || loading} onClick={() => setPage(value => value + 1)}>Sau</button></nav>}
      <footer>VINLOOK <span>Khởi đầu hành trình của bạn</span></footer>
    </aside>
    <section className="map-panel" aria-label="Khám phá trên bản đồ">
      <PoiMap pois={pois} selected={selected} onSelect={select} />
      <div className="map-badge"><span className="live-dot" /> Thành phố Hồ Chí Minh <span className="badge-country">VIỆT NAM</span></div>
      {selected && <article className="detail"><button className="close" aria-label="Đóng chi tiết" onClick={() => setSelected(null)}>×</button><span className="eyebrow">ĐIỂM DỪNG CỦA BẠN</span><h2>{selected.name}</h2>{detailError ? <p role="alert">{detailError}</p> : detail ? <><p>{detail.description}</p><p className="detail-address">{detail.address}</p><span className="coordinates">{detail.latitude.toFixed(4)}° N · {detail.longitude.toFixed(4)}° E</span></> : <p aria-live="polite">Đang tải câu chuyện địa điểm…</p>}</article>}
    </section>
  </main>;
}
