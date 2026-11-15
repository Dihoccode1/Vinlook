import { Button } from '@vinlook/ui/button';
import { Icon } from '../../components/Icon';
import { categories } from '../../services/api';
import type { ActivitySample, Stats } from '../../types';
import { ActivityChart } from './ActivityChart';
interface OverviewDashboardProps {
  stats: Stats | null;
  activity: { visitors: number; listeners: number } | null;
  samples: ActivitySample[];
  onNavigateCategories: () => void;
  onCreatePoi: () => void;
}
export function OverviewDashboard({
  stats,
  activity,
  samples,
  onNavigateCategories,
  onCreatePoi,
}: OverviewDashboardProps) {
  return (
    <>
      <section
        className="overview-metrics grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[18px] mb-[23px] [@media(max-width:_1150px)]:gap-[12px] [@media(max-width:_760px)]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_760px)]:gap-[9px] [@media(max-width:_760px)]:mb-[17px] [@media(max-width:_380px)]:gap-[7px]"
        aria-label="Các chỉ số chính"
      >
        <article className="overview-metric bg-white shadow-[0_2px_4px_#14372103]">
          <div>
            <span className="overview-metric-label text-[12px] text-[#7c8b74] font-medium [@media(max-width:_760px)]:text-[10px] [@media(max-width:_760px)]:leading-[1.5] [@media(max-width:_380px)]:text-[9px] [@media(min-width:_761px)]:text-[13px]">
              Tổng địa điểm
            </span>
            <span className="overview-metric-icon grid h-[32px] w-[32px] rounded-[9px] [@media(max-width:_760px)]:h-[25px] [@media(max-width:_760px)]:w-[25px] [@media(max-width:_760px)]:rounded-[7px] [@media(max-width:_380px)]:hidden sage">
              <Icon kind="pin" />
            </span>
          </div>
          <strong>{stats?.total ?? '—'}</strong>
          <p>
            <span className="metric-indicator h-[5px] w-[5px] shrink-0 rounded-[50%] bg-[#8aa376] [@media(max-width:_760px)]:hidden" />
            {stats ? stats.published + ' địa điểm đã xuất bản' : 'Đang tải nội dung…'}
          </p>
        </article>
        <article className="overview-metric bg-white shadow-[0_2px_4px_#14372103]">
          <div>
            <span className="overview-metric-label text-[12px] text-[#7c8b74] font-medium [@media(max-width:_760px)]:text-[10px] [@media(max-width:_760px)]:leading-[1.5] [@media(max-width:_380px)]:text-[9px] [@media(min-width:_761px)]:text-[13px]">
              Đang truy cập
            </span>
            <span className="overview-metric-icon grid h-[32px] w-[32px] rounded-[9px] [@media(max-width:_760px)]:h-[25px] [@media(max-width:_760px)]:w-[25px] [@media(max-width:_760px)]:rounded-[7px] [@media(max-width:_380px)]:hidden blue">
              <Icon kind="eye" />
            </span>
          </div>
          <strong>{activity?.visitors ?? '—'}</strong>
          <p>Phiên khách đang hoạt động trên bản đồ</p>
        </article>
        <article className="overview-metric bg-white shadow-[0_2px_4px_#14372103]">
          <div>
            <span className="overview-metric-label text-[12px] text-[#7c8b74] font-medium [@media(max-width:_760px)]:text-[10px] [@media(max-width:_760px)]:leading-[1.5] [@media(max-width:_380px)]:text-[9px] [@media(min-width:_761px)]:text-[13px]">
              Đang lắng nghe
            </span>
            <span className="overview-metric-icon grid h-[32px] w-[32px] rounded-[9px] [@media(max-width:_760px)]:h-[25px] [@media(max-width:_760px)]:w-[25px] [@media(max-width:_760px)]:rounded-[7px] [@media(max-width:_380px)]:hidden amber">
              <Icon kind="listen" />
            </span>
          </div>
          <strong>{activity?.listeners ?? '—'}</strong>
          <p>Phiên đang phát thuyết minh</p>
        </article>
      </section>
      <div className="overview-workspace grid grid-cols-[minmax(0,_1.8fr)_minmax(260px,_1fr)] gap-[20px] mb-[20px] [@media(max-width:_1150px)]:grid-cols-[minmax(0,_1.5fr)_minmax(235px,_1fr)] [@media(max-width:_1150px)]:gap-[15px] [@media(max-width:_940px)]:grid-cols-[1fr] [@media(max-width:_760px)]:gap-[17px] [@media(max-width:_760px)]:mb-[17px]">
        <ActivityChart samples={samples} />
        <section className="panel overflow-hidden categories-overview">
          <div className="panel-title justify-between">
            <div>
              <h2>Những điểm đến</h2>
              <p>Phân bố theo danh mục</p>
            </div>
            <span className="soft-badge whitespace-nowrap">
              {stats?.categories.length ?? '—'} danh mục
            </span>
          </div>
          <div className="category-bars">
            {stats?.categories.map((c) => {
              const pct = stats.total ? Math.round((c.total / stats.total) * 100) : 0;
              return (
                <div key={c.category} className="cat-row">
                  <div className="cat-meta flex justify-between items-center gap-[12px] text-[11px] text-[#73846c] mb-[10px] [@media(max-width:_940px)]:min-h-[32px] [@media(max-width:_940px)]:items-start [@media(max-width:_760px)]:text-[10px] [@media(max-width:_760px)]:gap-[6px] [@media(max-width:_380px)]:min-h-0 [@media(min-width:_761px)]:text-[12px]">
                    <span>{categories[c.category] ?? c.category}</span>
                    <strong>{c.total}</strong>
                  </div>
                  <div className="cat-bar h-[5px] rounded-[9px] bg-[#f0f3eb] overflow-hidden">
                    <div
                      className={'cat-fill h-full rounded-[9px] ' + c.category}
                      style={{ width: pct + '%' }}
                    />
                  </div>
                  <small>{pct}% tổng địa điểm</small>
                </div>
              );
            })}
          </div>
          <Button
            variant="custom"
            type="submit"
            className="category-detail-link bg-white w-full py-[14px] px-[22px] text-left text-[10px] text-[#5f7d50] flex items-center justify-between"
            onClick={onNavigateCategories}
          >
            Xem tất cả danh mục <span>↗</span>
          </Button>
        </section>
      </div>
      <div className="overview-invitation flex items-center gap-[15px] bg-[#ecf1e4] py-[17px] px-[22px] mb-[23px] [@media(max-width:_760px)]:p-[16px] [@media(max-width:_760px)]:gap-[10px] [@media(max-width:_760px)]:flex-wrap [@media(max-width:_760px)]:mb-[18px]">
        <span className="invitation-icon grid shrink-0 rounded-[50%] bg-[#e1e9d5] text-[#769167]">
          <Icon kind="pin" size={26} />
        </span>
        <div>
          <strong>Thêm một điểm đến. Mở một hành trình.</strong>
          <p>Đưa những câu chuyện mới lên bản đồ Vinlook.</p>
        </div>
        <Button variant="custom" type="submit" onClick={onCreatePoi}>
          Tạo địa điểm mới <Icon kind="plus" size={17} />
        </Button>
      </div>
    </>
  );
}
