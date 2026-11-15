import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePoiDetail } from '../features/poi/usePoiDetail';
import type { Poi } from '../types/poi';
import { use_location } from '../features/tracking/use-location';

import { https_url } from '../features/poi/image-url';
import { use_route_plan } from '../features/navigation/use-route-plan';

import { start_activity } from '../services/activity';
import { type MobileSheetHandle } from '../features/layout/MobileSheet';
import { use_poi_discovery } from '../features/poi/use-poi-discovery';

const categories: Record<string, string> = {
  market: 'Chợ',
  history: 'Lịch sử',
  architecture: 'Kiến trúc',
};

export function useExplorePage() {
  const sheet = useRef<MobileSheetHandle>(null);
  useEffect(start_activity, []);
  const [search, set_search] = useState('');
  const [content_language, set_content_language] = useState('vi');
  const [category, set_category] = useState('');
  const [page, set_page] = useState(1);
  const [selected, set_selected] = useState<Poi | null>(null);
  const { detail, detail_error } = usePoiDetail(selected);
  const [retry, set_retry] = useState(0);
  const location = use_location();
  const [show_gps_permission, set_show_gps_permission] = useState(true);
  const has_gps = location.active && location.position !== null;
  const searching = search.trim().length > 0;
  const {
    all_pois: all_pois,
    matches,
    loading,
    error,
  } = use_poi_discovery({ search, category, position: has_gps ? location.position : null }, retry);
  const total = matches.length;
  const page_count = Math.max(1, Math.ceil(total / 20));
  const current_page = Math.min(page, page_count);
  const visible_pois = matches.slice((current_page - 1) * 20, current_page * 20);
  const [view, set_view] = useState<'explore' | 'route'>('explore');
  const plan = use_route_plan(all_pois, location);
  const map_pois = useMemo(
    () => [...new Map([...all_pois, ...plan.stops].map((poi) => [poi.id, poi])).values()],
    [all_pois, plan.stops],
  );
  const [following, set_following] = useState(false);
  const [location_focus, set_location_focus] = useState(0);
  const stop_following = useCallback(() => set_following(false), []);
  const select = useCallback((poi: Poi) => {
    set_following(false);
    set_selected(poi);
    sheet.current?.collapse();
  }, []);
  const photo_poi = detail ?? selected;
  const photo_source = https_url(photo_poi?.image_source_url);
  const photo_license = https_url(photo_poi?.image_license_url);
  function locate() {
    set_selected(null);
    set_following(true);
    sheet.current?.collapse();
    set_location_focus((value) => value + 1);
    if (!location.active) location.start();
    else if (location.stale || location.error) location.refresh();
  }

  useEffect(() => {
    set_selected(null);
  }, [search, category]);
  useEffect(() => {
    set_page((previous) => Math.min(previous, page_count));
  }, [page_count]);

  return {
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
  };
}
