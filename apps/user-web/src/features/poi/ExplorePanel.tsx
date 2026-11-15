import { Button } from '@vinlook/ui/button';
import { Input } from '@vinlook/ui/input';
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
      <section className="intro">
        <span className="eyebrow text-[9px] tracking-[1.8px] font-bold text-vinlook-sage">
          KHÁM PHÁ THÀNH PHỐ
        </span>
        <h2>
          <span className="intro-desktop">
            Mỗi nơi đến,
            <br />
            một câu chuyện.
          </span>
          <span className="intro-mobile">Khám phá gần bạn</span>
        </h2>
        <p>Tìm những điểm dừng thú vị giữa lòng Sài Gòn.</p>
      </section>
      <label className="search-label text-[11px] font-semibold mb-[10px]" htmlFor="search">
        Bạn muốn khám phá đâu?
      </label>
      <Input
        appearance="custom"
        id="search"
        type="search"
        placeholder="Tìm tên hoặc địa chỉ…"
        value={search}
        maxLength={200}
        onChange={(event) => {
          set_search(event.target.value);
          set_page(1);
        }}
      />
      <div className="filters gap-[7px] flex-wrap" aria-label="Lọc danh mục">
        {Object.entries({ '': 'Tất cả', ...categories }).map(([value, label]) => (
          <Button
            variant="custom"
            type="submit"
            key={value}
            aria-pressed={category === value}
            className={category === value ? 'active' : ''}
            onClick={() => {
              set_category(value);
              set_page(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="list-heading items-center justify-between mb-[10px]">
        <h3>{searching ? 'Kết quả tìm kiếm' : 'Địa điểm gần bạn'}</h3>
        <span>{total} địa điểm</span>
      </div>
      <p className="discovery-scope text-[10px] leading-[1.6] text-[#788b71]">
        {searching
          ? 'Tìm theo tên hoặc địa chỉ · Không giới hạn khoảng cách'
          : 'Trong bán kính 5 km · Khoảng cách đường chim bay'}
      </p>
      <div
        className="results"
        role="region"
        aria-label="Danh sách địa điểm"
        tabIndex={0}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          <p className="state py-[20px] px-[4px] text-[12px] leading-[1.9]">Đang tải địa điểm…</p>
        ) : error ? (
          <div className="state py-[20px] px-[4px] text-[12px] leading-[1.9] error" role="alert">
            <p>{error}</p>
            <Button variant="custom" type="submit" onClick={() => set_retry((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        ) : !searching && !has_gps ? (
          <div className="state py-[20px] px-[4px] text-[12px] leading-[1.9]">
            <p>
              {location.status === 'locating'
                ? 'Đang chờ vị trí GPS để tìm địa điểm trong 5 km…'
                : location.stale
                  ? 'Đang chờ GPS cập nhật. Bạn vẫn có thể tìm kiếm địa điểm bằng tên hoặc địa chỉ.'
                  : 'Cho phép vị trí để xem địa điểm trong 5 km, hoặc nhập tên/địa chỉ để tìm kiếm.'}
            </p>
            <Button variant="custom" type="submit" onClick={locate}>
              Về vị trí của tôi
            </Button>
          </div>
        ) : visible_pois.length === 0 ? (
          <p className="state py-[20px] px-[4px] text-[12px] leading-[1.9]">
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
          className="pagination items-center justify-between text-[10px] pt-[12px]"
          aria-label="Phân trang"
        >
          <Button
            variant="custom"
            type="submit"
            disabled={current_page === 1 || loading}
            onClick={() => set_page(current_page - 1)}
          >
            Trước
          </Button>
          <span>
            Trang {current_page} / {page_count}
          </span>
          <Button
            variant="custom"
            type="submit"
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
