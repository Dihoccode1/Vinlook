import { PoiDetailPanel } from './features/poi/PoiDetailPanel';
import { ExplorePanel } from './features/poi/ExplorePanel';
import { PoiMap } from './features/map/PoiMap';
import { LocationControls } from './features/tracking/LocationControls';
import { LocationPermissionDialog } from './features/tracking/LocationPermissionDialog';
import { RoutePlanner } from './features/navigation/RoutePlanner';
import { MobileSheet } from './features/layout/MobileSheet';
import { useExplorePage } from './hooks/useExplorePage';
import { cn } from '@vinlook/ui/utils';

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
    <main className="app grid h-screen grid-cols-[440px_1fr] bg-[#f7f7f2] text-foreground">
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
        <header className="flex shrink-0 items-center gap-3.5 max-[760px]:gap-2.5">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground max-[760px]:size-9 max-[760px]:text-base"
            aria-hidden="true"
          >
            V
          </span>
          <div>
            <h1 className="text-[26px] font-bold leading-none tracking-tight text-foreground max-[760px]:text-[22px]">
              vinlook<span className="text-brand-dot">.</span>
            </h1>
            <p className="mt-1.5 text-[9px] font-medium tracking-[2px] text-muted-foreground max-[760px]:hidden">
              ĐI ĐỂ HIỂU THÊM
            </p>
          </div>
        </header>

        <div
          className="mt-6 mb-4 grid shrink-0 grid-cols-2 border-b border-border max-[760px]:mt-2.5 max-[760px]:mb-2.5"
          role="group"
          aria-label="Chế độ bản đồ"
        >
          <button
            type="button"
            aria-pressed={view === 'explore'}
            onClick={() => {
              set_view('explore');
              sheet.current?.expand();
            }}
            className={cn(
              'border-b-2 border-transparent py-2.5 text-center text-xs font-medium transition-colors',
              view === 'explore'
                ? 'border-primary font-semibold text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Khám phá
          </button>
          <button
            type="button"
            aria-pressed={view === 'route'}
            onClick={() => {
              set_view('route');
              sheet.current?.expand();
            }}
            className={cn(
              'border-b-2 border-transparent py-2.5 text-center text-xs font-medium transition-colors',
              view === 'route'
                ? 'border-primary font-semibold text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
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
        )}

        <footer
          data-sheet-collapsible=""
          data-sheet-short-hide=""
          className="mt-auto flex items-center justify-between pt-4 text-[10px] tracking-[1px] text-muted-foreground max-[760px]:mt-5"
        >
          <span>VINLOOK</span>
          <span className="tracking-normal">Khởi đầu hành trình của bạn</span>
        </footer>
      </MobileSheet>

      <section
        className="map-panel relative h-full min-h-0 overflow-hidden"
        aria-label="Khám phá trên bản đồ"
      >
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
        <div className="pointer-events-auto absolute top-[25px] left-[25px] z-[450] flex items-center gap-2.5 rounded-[9px] bg-[#fffffff2] px-[18px] py-[14px] text-[11px] font-semibold text-foreground shadow-[0_4px_20px_#16342613] max-[760px]:top-3 max-[760px]:left-3 max-[760px]:px-3.5 max-[760px]:py-2.5">
          <span className="size-[7px] rounded-full bg-[#789765]" aria-hidden="true" />
          <span>Thành phố Hồ Chí Minh</span>
          <span className="border-l border-[#dce1d7] pl-3 text-[8px] tracking-[1px] text-[#8a9387] max-[760px]:hidden">
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
