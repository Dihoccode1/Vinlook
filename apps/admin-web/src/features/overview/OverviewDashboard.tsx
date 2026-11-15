import { Badge } from '@vinlook/ui/badge';
import { Button } from '@vinlook/ui/button';
import { Card } from '@vinlook/ui/card';
import { cn } from '@vinlook/ui/utils';
import { Icon } from '../../components/Icon';
import { categories } from '../../services/api';
import type { ActivitySample, Stats } from '../../types';
import { ActivityChart } from './ActivityChart';

const CATEGORY_BAR_COLOR: Record<string, string> = {
  market: 'bg-[#cba87c]',
  history: 'bg-[#98ad87]',
  architecture: 'bg-[#839d9b]',
};

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
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[18px]"
        aria-label="Các chỉ số chính"
      >
        <Card className="gap-0 rounded-xl border-[#e2e8dc] bg-white px-[22px] pt-[21px] pb-[18px] shadow-[0_2px_4px_#14372103]">
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-xs font-medium text-[#7c8b74] md:text-[13px]">Tổng địa điểm</span>
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#edf3e6] text-[#789961]">
              <Icon kind="pin" />
            </span>
          </div>
          <strong className="mt-1 mb-1.5 block text-[32px] leading-[1.35] font-semibold tracking-[-1px] text-foreground md:text-4xl">
            {stats?.total ?? '—'}
          </strong>
          <p className="m-0 flex items-center gap-1.5 text-[10px] leading-[1.7] text-[#98a18e] md:text-[11px]">
            <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#8aa376]" />
            {stats ? stats.published + ' địa điểm đã xuất bản' : 'Đang tải nội dung…'}
          </p>
        </Card>
        <Card className="gap-0 rounded-xl border-[#e2e8dc] bg-white px-[22px] pt-[21px] pb-[18px] shadow-[0_2px_4px_#14372103]">
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-xs font-medium text-[#7c8b74] md:text-[13px]">Đang truy cập</span>
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#edf4f8] text-[#6c96a9]">
              <Icon kind="eye" />
            </span>
          </div>
          <strong className="mt-1 mb-1.5 block text-[32px] leading-[1.35] font-semibold tracking-[-1px] text-foreground md:text-4xl">
            {activity?.visitors ?? '—'}
          </strong>
          <p className="m-0 flex items-center gap-1.5 text-[10px] leading-[1.7] text-[#98a18e] md:text-[11px]">
            Phiên khách đang hoạt động trên bản đồ
          </p>
        </Card>
        <Card className="gap-0 rounded-xl border-[#e2e8dc] bg-white px-[22px] pt-[21px] pb-[18px] shadow-[0_2px_4px_#14372103] sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-xs font-medium text-[#7c8b74] md:text-[13px]">
              Đang lắng nghe
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#fbf1e5] text-[#c5935c]">
              <Icon kind="listen" />
            </span>
          </div>
          <strong className="mt-1 mb-1.5 block text-[32px] leading-[1.35] font-semibold tracking-[-1px] text-foreground md:text-4xl">
            {activity?.listeners ?? '—'}
          </strong>
          <p className="m-0 flex items-center gap-1.5 text-[10px] leading-[1.7] text-[#98a18e] md:text-[11px]">
            Phiên đang phát thuyết minh
          </p>
        </Card>
      </section>
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,1fr)]">
        <ActivityChart samples={samples} />
        <Card className="flex min-w-0 flex-col gap-0 overflow-hidden rounded-xl border-[#e2e8dc] bg-white shadow-[0_2px_4px_#14372103]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] pt-[21px] pb-[15px]">
            <div>
              <h2 className="m-0 text-[15px] leading-[1.6] font-semibold text-[#2d473a] md:text-base">
                Những điểm đến
              </h2>
              <p className="mt-1 mb-0 text-[10px] leading-[1.8] text-[#96a18b] md:text-[11px]">
                Phân bố theo danh mục
              </p>
            </div>
            <Badge
              variant="muted"
              className="rounded-md bg-[#f2f5ec] px-2 py-1.5 text-[10px] font-medium text-[#8c9f79]"
            >
              {stats?.categories.length ?? '—'} danh mục
            </Badge>
          </div>
          <div className="flex-1 px-[22px] pb-2">
            {stats?.categories.map((c) => {
              const pct = stats.total ? Math.round((c.total / stats.total) * 100) : 0;
              return (
                <div key={c.category} className="mt-1.5 mb-5">
                  <div className="mb-2.5 flex items-center justify-between gap-3 text-[11px] text-[#73846c] md:text-xs">
                    <span>{categories[c.category] ?? c.category}</span>
                    <strong className="text-[13px] font-semibold text-[#4e6949]">{c.total}</strong>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-full bg-[#f0f3eb]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width] duration-300',
                        CATEGORY_BAR_COLOR[c.category] ?? 'bg-[#9eae8a]',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <small className="mt-2 block text-[9px] text-[#a2ac96] md:text-[10px]">
                    {pct}% tổng địa điểm
                  </small>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-auto flex w-full cursor-pointer items-center justify-between border-0 border-t border-[#edf0e7] bg-white px-[22px] py-3.5 text-left text-[11px] font-medium text-[#5f7d50] transition-colors hover:bg-[#f8faf4] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            onClick={onNavigateCategories}
          >
            Xem tất cả danh mục <span>↗</span>
          </button>
        </Card>
      </div>
      <div className="mb-6 flex flex-col items-start gap-4 rounded-[10px] border border-[#e0e7d5] bg-[#ecf1e4] px-[22px] py-[17px] sm:flex-row sm:items-center">
        <span className="grid h-[41px] w-[41px] shrink-0 place-items-center rounded-full bg-[#e1e9d5] text-[#769167]">
          <Icon kind="pin" size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="text-xs font-semibold text-[#4f6945] md:text-[13px]">
            Thêm một điểm đến. Mở một hành trình.
          </strong>
          <p className="mt-1 mb-0 text-[10px] leading-[1.7] text-[#91a180] md:text-[11px]">
            Đưa những câu chuyện mới lên bản đồ Vinlook.
          </p>
        </div>
        <Button
          type="button"
          onClick={onCreatePoi}
          className="h-9 w-full shrink-0 rounded-lg px-4 text-xs sm:ml-auto sm:w-auto"
        >
          Tạo địa điểm mới <Icon kind="plus" size={17} />
        </Button>
      </div>
    </>
  );
}
