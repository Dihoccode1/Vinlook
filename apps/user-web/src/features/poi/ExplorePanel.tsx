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
        <span className="eyebrow">KHÁM PHÁ THÀNH PHỐ</span>
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
      <label className="search-label" htmlFor="search">
        Bạn muốn khám phá đâu?
      </label>
      <input
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
      <div className="filters" aria-label="Lọc danh mục">
        {Object.entries({ '': 'Tất cả', ...categories }).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={category === value}
            className={category === value ? 'active' : ''}
            onClick={() => {
              set_category(value);
              set_page(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="list-heading">
        <h3>{searching ? 'Kết quả tìm kiếm' : 'Địa điểm gần bạn'}</h3>
        <span>{total} địa điểm</span>
      </div>
      <p className="discovery-scope">
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
          <p className="state">Đang tải địa điểm…</p>
        ) : error ? (
          <div className="state error" role="alert">
            <p>{error}</p>
            <button onClick={() => set_retry((value) => value + 1)}>Thử lại</button>
          </div>
        ) : !searching && !has_gps ? (
          <div className="state">
            <p>
              {location.status === 'locating'
                ? 'Đang chờ vị trí GPS để tìm địa điểm trong 5 km…'
                : location.stale
                  ? 'Đang chờ GPS cập nhật. Bạn vẫn có thể tìm kiếm địa điểm bằng tên hoặc địa chỉ.'
                  : 'Cho phép vị trí để xem địa điểm trong 5 km, hoặc nhập tên/địa chỉ để tìm kiếm.'}
            </p>
            <button onClick={locate}>Về vị trí của tôi</button>
          </div>
        ) : visible_pois.length === 0 ? (
          <p className="state">
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
        <nav className="pagination" aria-label="Phân trang">
          <button
            disabled={current_page === 1 || loading}
            onClick={() => set_page(current_page - 1)}
          >
            Trước
          </button>
          <span>
            Trang {current_page} / {page_count}
          </span>
          <button
            disabled={current_page === page_count || loading}
            onClick={() => set_page(current_page + 1)}
          >
            Sau
          </button>
        </nav>
      )}
    </>
  );
}
