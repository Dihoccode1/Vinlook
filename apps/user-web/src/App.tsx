import { Button } from '@vinlook/ui/button';
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
    <main className="app grid grid-cols-[410px_1fr] h-[100dvh] [@media(max-width:_760px)]:grid-cols-[1fr] [@media(max-width:_760px)]:grid-rows-[52dvh_48dvh] [@media(max-width:_760px)]:h-[100dvh] [@media(max-width:_760px)]:min-h-0 [@media(max-width:_760px)]:relative [@media(max-width:_760px)]:block [@media(max-width:_760px)]:overflow-hidden">
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
        <header className="brand flex gap-[11px] items-center">
          <span
            className="brand-icon grid bg-vinlook-forest text-[white] rounded-[13px] w-[43px] h-[43px] font-extrabold text-[24px] [@media(max-width:_760px)]:w-[35px] [@media(max-width:_760px)]:h-[35px] [@media(max-width:_760px)]:text-[20px]"
            aria-hidden="true"
          >
            V
          </span>
          <div>
            <h1>
              vinlook<span>.</span>
            </h1>
            <p>ĐI ĐỂ HIỂU THÊM</p>
          </div>
        </header>
        <div className="view-tabs flex" role="group" aria-label="Chế độ bản đồ">
          <Button
            variant="custom"
            type="submit"
            aria-pressed={view === 'explore'}
            onClick={() => {
              set_view('explore');
              sheet.current?.expand();
            }}
          >
            Khám phá
          </Button>
          <Button
            variant="custom"
            type="submit"
            aria-pressed={view === 'route'}
            onClick={() => {
              set_view('route');
              sheet.current?.expand();
            }}
          >
            Lộ trình{plan.stops.length > 0 ? ` · ${plan.stops.length}` : ''}
          </Button>
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
      <section className="map-panel min-w-0" aria-label="Khám phá trên bản đồ">
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
        <div className="map-badge absolute top-[25px] left-[25px] z-[450] flex items-center gap-[10px] bg-[#fffffff2] shadow-[0_4px_20px_#16342613] rounded-[9px] py-[14px] px-[18px] text-[11px] font-semibold [@media(max-width:_760px)]:top-[15px] [@media(max-width:_760px)]:left-[15px] [@media(max-width:_760px)]:p-[11px] [@media(max-width:_760px)]:text-[10px]">
          <span className="live-dot h-[7px] w-[7px] rounded-[50%] bg-[#789765]" /> Thành phố Hồ Chí
          Minh{' '}
          <span className="badge-country text-[8px] text-[#8a9387] pl-[12px] tracking-[1px] [@media(max-width:_760px)]:hidden">
            VIỆT NAM
          </span>
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
