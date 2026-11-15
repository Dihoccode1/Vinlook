import { Button } from '@vinlook/ui/button';
import { useEffect, useState } from 'react';

export function MapCredits() {
  const [view, set_view] = useState<'notice' | 'details' | 'closed'>('notice');
  useEffect(() => {
    if (view !== 'notice') return;
    const timer = window.setTimeout(
      () => set_view((previous) => (previous === 'notice' ? 'closed' : previous)),
      5000,
    );
    return () => window.clearTimeout(timer);
  }, [view]);
  return (
    <div className="map-credits absolute z-[450]">
      {view !== 'closed' && (
        <section
          id="map-credits-panel"
          className={`map-credits-panel absolute bottom-[40px] left-[0] max-w-[calc(100vw_-_30px)] bg-[#fffef9] shadow-[0_4px_20px_#12302122] text-[12px] leading-[1.7] text-[#61725b] ${view}`}
          aria-label="Nguồn dữ liệu bản đồ"
        >
          <Button
            variant="custom"
            type="submit"
            className="credits-close absolute top-[4px] right-[4px] w-[28px] h-[28px] bg-[transparent] text-[#667b5c] text-[20px]"
            aria-label="Đóng thông tin nguồn"
            onClick={() => set_view('closed')}
          >
            ×
          </Button>
          {view === 'details' && <h3>Nguồn dữ liệu</h3>}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            © OpenStreetMap
          </a>
          {view === 'details' && (
            <>
              <p>
                Hiển thị bản đồ bằng{' '}
                <a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">
                  Leaflet
                </a>
                .
              </p>
              <p>Tác giả và giấy phép ảnh nằm trong thông tin chi tiết của từng địa điểm.</p>
            </>
          )}
        </section>
      )}
      <Button
        variant="custom"
        type="submit"
        className="map-credits-toggle grid w-[30px] h-[30px] p-[0] bg-[#fffef9f2] text-[#55714f] text-[21px] leading-[1] shadow-[0_2px_8px_#12302114]"
        aria-label="Thông tin nguồn bản đồ"
        aria-controls="map-credits-panel"
        aria-expanded={view !== 'closed'}
        onClick={() =>
          set_view((previous) =>
            previous === 'closed' || previous === 'notice' ? 'details' : 'closed',
          )
        }
      >
        ⓘ
      </Button>
    </div>
  );
}
