import { PoiDetailPanel } from './features/poi/PoiDetailPanel';
import { ExplorePanel } from './features/poi/ExplorePanel';

import { PoiMap } from './features/map/PoiMap';

import { LocationControls } from './features/tracking/LocationControls';
import { LocationPermissionDialog } from './features/tracking/LocationPermissionDialog';

import { RoutePlanner } from './features/navigation/RoutePlanner';

import { MobileSheet } from './features/layout/MobileSheet';

import { useExplorePage } from './hooks/useExplorePage';
export default function App() {
  const {
    sheet,
    search,
    set_search,
    content_language,
    set_content_language,
    category,
    set_category,
    set_page,
    selected,
    set_selected,
    detail,
    detail_error,
    set_retry,
    location,
    show_gps_permission,
    set_show_gps_permission,
    has_gps,
    searching,
    all_pois,
    loading,
    error,
    total,
    page_count,
    current_page,
    visible_pois,
    view,
    set_view,
    plan,
    map_pois,
    following,
    set_following,
    location_focus,
    stop_following,
    select,
    photo_poi,
    photo_source,
    photo_license,
    locate,
    categories,
  } = useExplorePage();
  return (
    <main className="app">
      {show_gps_permission && (
        <LocationPermissionDialog
          on_allow={() => {
            set_show_gps_permission(false);
            locate();
          }}
          on_later={() => {
            location.stop();
            set_show_gps_permission(false);
          }}
        />
      )}
      <MobileSheet ref={sheet}>
        <header className="brand">
          <span className="brand-icon" aria-hidden="true">
            V
          </span>
          <div>
            <h1>
              vinlook<span>.</span>
            </h1>
            <p>ĐI ĐỂ HIỂU THÊM</p>
          </div>
        </header>
        <div className="view-tabs" role="group" aria-label="Chế độ bản đồ">
          <button
            aria-pressed={view === 'explore'}
            onClick={() => {
              set_view('explore');
              sheet.current?.expand();
            }}
          >
            Khám phá
          </button>
          <button
            aria-pressed={view === 'route'}
            onClick={() => {
              set_view('route');
              sheet.current?.expand();
            }}
          >
            Lộ trình{plan.stops.length > 0 ? ` · ${plan.stops.length}` : ''}
          </button>
        </div>
        {view === 'route' ? (
          <RoutePlanner
            plan={plan}
            pois={all_pois}
            on_explore={() => {
              set_view('explore');
              sheet.current?.expand();
            }}
            on_show_route={() => {
              set_selected(null);
              set_following(false);
              sheet.current?.collapse();
            }}
            on_calculate={() => {
              set_selected(null);
              set_following(false);
              sheet.current?.collapse();
              void plan.calculate();
            }}
          />
        ) : (
          <>
            <ExplorePanel
              search={search}
              set_search={set_search}
              category={category}
              set_category={set_category}
              set_page={set_page}
              selected={selected}
              set_retry={set_retry}
              location={location}
              has_gps={has_gps}
              searching={searching}
              loading={loading}
              error={error}
              total={total}
              page_count={page_count}
              current_page={current_page}
              visible_pois={visible_pois}
              select={select}
              locate={locate}
              categories={categories}
            />
          </>
        )}
        <footer>
          VINLOOK <span>Khởi đầu hành trình của bạn</span>
        </footer>
      </MobileSheet>
      <section className="map-panel" aria-label="Khám phá trên bản đồ">
        <PoiMap
          pois={map_pois}
          selected={selected}
          on_select={select}
          position={location.position}
          stale={location.stale}
          following={following}
          location_focus={location_focus}
          on_manual_move={stop_following}
          route={plan.route}
          itinerary={plan.stops}
          profile={plan.profile}
        />
        <LocationControls {...location} on_locate={locate} />
        <div className="map-badge">
          <span className="live-dot" /> Thành phố Hồ Chí Minh{' '}
          <span className="badge-country">VIỆT NAM</span>
        </div>
        {selected && (
          <PoiDetailPanel
            sheet={sheet}
            content_language={content_language}
            set_content_language={set_content_language}
            selected={selected}
            set_selected={set_selected}
            detail={detail}
            detail_error={detail_error}
            set_view={set_view}
            plan={plan}
            set_following={set_following}
            photo_poi={photo_poi}
            photo_source={photo_source}
            photo_license={photo_license}
          />
        )}
      </section>
    </main>
  );
}
