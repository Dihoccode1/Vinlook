import { Alert, AlertDescription } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { Input } from '@vinlook/ui/input';
import { Label } from '@vinlook/ui/label';
import { cn } from '@vinlook/ui/utils';
import { PoiCard } from './PoiCard';
import type { useExplorePage } from '../../hooks/useExplorePage';

type Props = Pick<
  ReturnType<typeof useExplorePage>,
  | 'search'
  | 'set_search'
  | 'category'
  | 'set_category'
  | 'set_page'
  | 'selected'
  | 'set_retry'
  | 'location'
  | 'has_gps'
  | 'searching'
  | 'loading'
  | 'error'
  | 'total'
  | 'page_count'
  | 'current_page'
  | 'visible_pois'
  | 'select'
  | 'locate'
  | 'categories'
>;

export function ExplorePanel({
  search,
  set_search,
  category,
  set_category,
  set_page,
  selected,
  set_retry,
  location,
  has_gps,
  searching,
  loading,
  error,
  total,
  page_count,
  current_page,
  visible_pois,
  select,
  locate,
  categories,
}: Props) {
  return (
    <>
      <section
        data-sheet-collapsible=""
        data-sheet-short-hide=""
        className="mt-2 mb-6 shrink-0 max-[760px]:mt-3 max-[760px]:mb-3.5"
      >
        <span className="text-[10px] font-medium tracking-[1.6px] text-muted-foreground uppercase max-[760px]:hidden">
          KHÁM PHÁ THÀNH PHỐ
        </span>
        <h2 className="my-2.5 text-[30px] leading-[1.18] font-bold tracking-[-0.7px] text-foreground max-[760px]:my-1 max-[760px]:text-xl max-[760px]:leading-[1.3] max-[760px]:tracking-[-0.4px]">
          <span className="max-[760px]:hidden">
            Mỗi nơi đến,
            <br />
            một câu chuyện.
          </span>
          <span className="hidden max-[760px]:inline">Khám phá gần bạn</span>
        </h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground max-[760px]:hidden">
          Tìm những điểm dừng thú vị giữa lòng Sài Gòn.
        </p>
      </section>

      <Label
        data-sheet-collapsible=""
        htmlFor="search"
        className="mb-2 text-[11px] font-semibold text-foreground"
      >
        Bạn muốn khám phá đâu?
      </Label>
      <Input
        id="search"
        type="search"
        placeholder="Tìm tên hoặc địa chỉ…"
        value={search}
        maxLength={200}
        onChange={(event) => {
          set_search(event.target.value);
          set_page(1);
        }}
        className="h-11 shrink-0 rounded-[10px] border-[#dce3d9] bg-white px-3.5 text-xs text-[#223c32]"
      />

      <div
        data-sheet-collapsible=""
        className="my-3.5 mb-6 flex shrink-0 flex-wrap gap-[7px]"
        aria-label="Lọc danh mục"
      >
        {Object.entries({ '': 'Tất cả', ...categories }).map(([value, label]) => {
          const active = category === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                set_category(value);
                set_page(1);
              }}
              className={cn(
                'rounded-[22px] border px-3 py-2 text-[10px] font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-[#dce3d9] bg-transparent text-[#5a6b60] hover:bg-white/70',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div data-sheet-collapsible="" className="mb-2.5 flex shrink-0 items-center justify-between">
        <h3 className="m-0 text-xs font-semibold text-foreground">
          {searching ? 'Kết quả tìm kiếm' : 'Địa điểm gần bạn'}
        </h3>
        <span className="text-[10px] text-[#7e8980]">{total} địa điểm</span>
      </div>
      <p
        data-sheet-collapsible=""
        className="m-0 mb-2.5 shrink-0 text-[10px] leading-[1.6] text-[#788b71]"
      >
        {searching
          ? 'Tìm theo tên hoặc địa chỉ · Không giới hạn khoảng cách'
          : 'Trong bán kính 5 km · Khoảng cách đường chim bay'}
      </p>

      <div
        data-sheet-collapsible=""
        className="min-h-[90px] flex-1 overflow-y-auto overscroll-y-contain max-[760px]:min-h-0"
        role="region"
        aria-label="Danh sách địa điểm"
        tabIndex={0}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          <p className="px-1 py-5 text-xs leading-[1.9] text-[#788478]">Đang tải địa điểm…</p>
        ) : error ? (
          <Alert variant="destructive" className="my-2 flex-col items-start gap-2.5">
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" size="sm" onClick={() => set_retry((value) => value + 1)}>
              Thử lại
            </Button>
          </Alert>
        ) : !searching && !has_gps ? (
          <div className="space-y-3 px-1 py-5 text-xs leading-[1.9] text-[#788478]">
            <p>
              {location.status === 'locating'
                ? 'Đang chờ vị trí GPS để tìm địa điểm trong 5 km…'
                : location.stale
                  ? 'Đang chờ GPS cập nhật. Bạn vẫn có thể tìm kiếm địa điểm bằng tên hoặc địa chỉ.'
                  : 'Cho phép vị trí để xem địa điểm trong 5 km, hoặc nhập tên/địa chỉ để tìm kiếm.'}
            </p>
            <Button variant="outline" size="sm" onClick={locate}>
              Về vị trí của tôi
            </Button>
          </div>
        ) : visible_pois.length === 0 ? (
          <p className="px-1 py-5 text-xs leading-[1.9] text-[#788478]">
            {searching
              ? 'Chưa tìm thấy địa điểm phù hợp. Thử từ khóa khác nhé.'
              : 'Chưa có địa điểm phù hợp trong bán kính 5 km. Nhập tên hoặc địa chỉ để tìm xa hơn.'}
          </p>
        ) : (
          visible_pois.map(({ poi, distance_meters: distance_meters }) => (
            <PoiCard
              key={poi.id}
              poi={poi}
              selected={selected}
              distance_meters={distance_meters}
              categories={categories}
              select={select}
            />
          ))
        )}
      </div>

      {total > 20 && (
        <nav
          data-sheet-collapsible=""
          className="flex shrink-0 items-center justify-between pt-3 text-[10px] text-muted-foreground"
          aria-label="Phân trang"
        >
          <Button
            variant="outline"
            size="xs"
            disabled={current_page === 1 || loading}
            onClick={() => set_page(current_page - 1)}
          >
            Trước
          </Button>
          <span>
            Trang {current_page} / {page_count}
          </span>
          <Button
            variant="outline"
            size="xs"
            disabled={current_page === page_count || loading}
            onClick={() => set_page(current_page + 1)}
          >
            Sau
          </Button>
        </nav>
      )}
    </>
  );
}
