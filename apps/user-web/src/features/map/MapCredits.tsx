import { useEffect, useState } from 'react';
import { cn } from '@vinlook/ui/utils';

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
    <div className="map-credits absolute bottom-[15px] left-[15px] z-[450]">
      {view !== 'closed' && (
        <section
          id="map-credits-panel"
          className={cn(
            'absolute bottom-10 left-0 max-w-[calc(100vw-30px)] rounded-[10px] border border-[#dce4d5] bg-[#fffef9] text-xs leading-[1.7] text-[#61725b] shadow-[0_4px_20px_#12302122]',
            view === 'notice'
              ? 'w-[205px] px-3 py-2.5 pr-[30px]'
              : 'w-[280px] py-4 pr-8 pb-3.5 pl-3.5',
          )}
          aria-label="Nguồn dữ liệu bản đồ"
        >
          <button
            type="button"
            aria-label="Đóng thông tin nguồn"
            onClick={() => set_view('closed')}
            className="absolute top-1 right-1 grid size-7 place-items-center text-xl leading-none text-[#667b5c]"
          >
            ×
          </button>
          {view === 'details' && (
            <h3 className="mb-2 text-[13px] font-semibold text-[#294b34]">Nguồn dữ liệu</h3>
          )}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#375e3b] hover:underline"
          >
            © OpenStreetMap
          </a>
          {view === 'details' && (
            <>
              <p className="mt-2">
                Hiển thị bản đồ bằng{' '}
                <a
                  href="https://leafletjs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#375e3b] underline"
                >
                  Leaflet
                </a>
                .
              </p>
              <p className="mt-2">
                Tác giả và giấy phép ảnh nằm trong thông tin chi tiết của từng địa điểm.
              </p>
            </>
          )}
        </section>
      )}
      <button
        type="button"
        aria-label="Thông tin nguồn bản đồ"
        aria-controls="map-credits-panel"
        aria-expanded={view !== 'closed'}
        onClick={() =>
          set_view((previous) =>
            previous === 'closed' || previous === 'notice' ? 'details' : 'closed',
          )
        }
        className="grid size-[30px] place-items-center rounded-full border border-[#d9e2d3] bg-[#fffef9f2] text-[21px] leading-none text-[#55714f] shadow-[0_2px_8px_#12302114]"
      >
        ⓘ
      </button>
    </div>
  );
}
