import { useEffect, useState } from 'react';

export function MapCredits() {
  const [view, set_view] = useState<'notice' | 'details' | 'closed'>('notice');
  useEffect(() => {
    if (view !== 'notice') return;
    const timer = window.setTimeout(() => set_view(previous => previous === 'notice' ? 'closed' : previous), 5000);
    return () => window.clearTimeout(timer);
  }, [view]);
  return <div className="map-credits">
    {view !== 'closed' && <section id="map-credits-panel" className={`map-credits-panel ${view}`} aria-label="Nguồn dữ liệu bản đồ">
      <button className="credits-close" aria-label="Đóng thông tin nguồn" onClick={() => set_view('closed')}>×</button>
      {view === 'details' && <h3>Nguồn dữ liệu</h3>}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>
      {view === 'details' && <><p>Hiển thị bản đồ bằng <a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">Leaflet</a>.</p><p>Tác giả và giấy phép ảnh nằm trong thông tin chi tiết của từng địa điểm.</p></>}
    </section>}
    <button className="map-credits-toggle" aria-label="Thông tin nguồn bản đồ" aria-controls="map-credits-panel" aria-expanded={view !== 'closed'} onClick={() => set_view(previous => previous === 'closed' || previous === 'notice' ? 'details' : 'closed')}>ⓘ</button>
  </div>;
}
