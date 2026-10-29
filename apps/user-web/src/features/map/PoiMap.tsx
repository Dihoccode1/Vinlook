import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Poi } from '../../types/poi';
import type { LocationFix } from '../tracking/location-tracker';
import { placeholder_image, poi_image_url } from '../poi/image-url';
import type { PlannedRoute, VehicleProfile } from '../navigation/types';
import { route_leg_color } from '../navigation/route-colors';
import { MapCredits } from './MapCredits';

interface Props {
  pois: Poi[];
  selected: Poi | null;
  on_select: (poi: Poi) => void;
  position: LocationFix | null;
  stale: boolean;
  following: boolean;
  location_focus: number;
  on_manual_move: () => void;
  route: PlannedRoute | null;
  itinerary: Poi[];
  profile: VehicleProfile;
}

export function PoiMap({ pois, selected, on_select: on_select, position, stale, following, location_focus: location_focus, on_manual_move: on_manual_move, route, itinerary, profile }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const location_layer = useRef<L.LayerGroup | null>(null);
  const route_layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { zoomControl: false, attributionControl: false }).setView([10.777, 106.698], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(instance);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    map.current = instance;
    markers.current = L.layerGroup().addTo(instance);
    location_layer.current = L.layerGroup().addTo(instance);
    route_layer.current = L.layerGroup().addTo(instance);
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => instance.invalidateSize({ pan: false })) : null;
    resize?.observe(element.current);
    return () => { resize?.disconnect(); instance.remove(); map.current = null; markers.current = null; location_layer.current = null; route_layer.current = null; };
  }, []);

  useEffect(() => {
    const layer = markers.current;
    if (!layer) return;
    layer.clearLayers();
    const stop_ids = route?.stop_ids ?? itinerary.map(poi => poi.id);
    for (const poi of pois) {
      const stop_index = stop_ids.indexOf(poi.id);
      const label = document.createElement('span');
      label.textContent = stop_index >= 0 ? `Điểm ${stop_index + 1}: ${poi.name}` : poi.name;
      const element = document.createElement('div');
      element.className = `poi-photo-pin ${poi.id === selected?.id ? 'is-selected' : ''}`;
      const photo = document.createElement('img');
      photo.src = poi_image_url(poi.image_url);
      photo.alt = poi.name;
      photo.referrerPolicy = 'no-referrer';
      photo.decoding = 'async';
      photo.addEventListener('error', () => { photo.src = placeholder_image; }, { once: true });
      element.appendChild(photo);
      if (stop_index >= 0) {
        const badge = document.createElement('span');
        badge.className = 'poi-stop-badge'; badge.textContent = String(stop_index + 1);
        badge.style.backgroundColor = route_leg_color(profile, stop_index);
        element.appendChild(badge);
      }
      const marker = L.marker([poi.latitude, poi.longitude], {
        icon: L.divIcon({ html: element, className: 'poi-photo-icon', iconSize: [64, 64], iconAnchor: [32, 64], tooltipAnchor: [0, -64] }),
        title: label.textContent,
        alt: `Xem ${poi.name}`,
        riseOnHover: true,
        zIndexOffset: poi.id === selected?.id ? 1000 : 0,
      });
      marker.bindTooltip(label).on('click', () => on_select(poi)).addTo(layer);
    }
  }, [pois, selected, on_select, itinerary, profile, route]);

  useEffect(() => {
    const instance = map.current;
    if (!selected || !instance) return;
    const size = instance.getSize();
    // Keep the selected photo clear of the detail card and GPS controls.
    const target = size.x > 760
      ? L.point(size.x * 0.74, size.y * 0.48)
      : L.point(size.x * 0.2, size.y * 0.3);
    const center = instance.unproject(
      instance.project([selected.latitude, selected.longitude], 16).add(size.divideBy(2).subtract(target)), 16,
    );
    instance.flyTo(center, 16, { duration: 0.6 });
  }, [selected]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    instance.on('dragstart', on_manual_move);
    return () => { instance.off('dragstart', on_manual_move); };
  }, [on_manual_move]);

  useEffect(() => {
    const layer = location_layer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!position) return;
    const center: L.LatLngExpression = [position.latitude, position.longitude];
    const color = stale ? '#7c858e' : '#2477d5';
    L.circle(center, { radius: position.accuracy, color, weight: 1, fillOpacity: 0.1, dashArray: stale ? '5 5' : undefined }).addTo(layer);
    L.circleMarker(center, { radius: 8, color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1 })
      .bindTooltip(stale ? 'Vị trí cập nhật gần nhất' : 'Vị trí của bạn').addTo(layer);
  }, [position, stale]);

  useEffect(() => {
    if (following && position && !stale) {
      map.current?.setView([position.latitude, position.longitude], Math.max(map.current.getZoom(), 16));
    }
  }, [following, position, stale, location_focus]);

  useEffect(() => {
    const layer = route_layer.current;
    const instance = map.current;
    if (!layer || !instance) return;
    layer.clearLayers();
    if (!route) return;
    const bounds = L.latLngBounds([]);
    // SVG paints later paths above earlier ones. Draw the last leg first so
    // earlier itinerary legs (including their white casing) win on overlaps.
    route.legs.map((leg, index) => ({ leg, index })).reverse().forEach(({ leg, index }) => {
      // Road geometry comes from the provider for this leg, never straight POI-to-POI lines.
      const coordinates = leg.geometry?.coordinates ?? (route.legs.length === 1 ? route.geometry.coordinates : []);
      if (coordinates.length < 2) return;
      const points = coordinates.map(([longitude, latitude]) => L.latLng(latitude, longitude));
      points.forEach(point => bounds.extend(point));
      const color = route_leg_color(route.profile, index);
      L.polyline(points, { color: '#fff', weight: 10, opacity: 0.95, interactive: false }).addTo(layer);
      const tooltip = document.createElement('span');
      const destination = itinerary.find(poi => poi.id === route.stop_ids?.[index])?.name ?? `Điểm ${index + 1}`;
      tooltip.textContent = `Chặng ${index + 1}: ${index === 0 ? 'A' : index} → ${index + 1} · ${destination}`;
      L.polyline(points, { color, weight: 5, opacity: 1, dashArray: route.profile === 'walking' ? '7 8' : undefined }).bindTooltip(tooltip).addTo(layer);

      const lengths = points.slice(1).map((point, i) => point.distanceTo(points[i]));
      const total = lengths.reduce((sum, length) => sum + length, 0);
      for (const fraction of [0.35, 0.72]) {
        let remaining = total * fraction;
        for (let i = 0; i < lengths.length; i++) {
          if (remaining > lengths[i]) { remaining -= lengths[i]; continue; }
          if (lengths[i] < 1) continue;
          const ratio = remaining / lengths[i];
          const from = points[i], to = points[i + 1];
          const position = L.latLng(from.lat + (to.lat - from.lat) * ratio, from.lng + (to.lng - from.lng) * ratio);
          const delta = instance.project(to, 16).subtract(instance.project(from, 16));
          const arrow = document.createElement('span');
          arrow.className = 'route-direction-arrow'; arrow.textContent = '➤'; arrow.style.color = color;
          arrow.style.transform = `rotate(${Math.atan2(delta.y, delta.x) * 180 / Math.PI}deg)`;
          L.marker(position, { icon: L.divIcon({ html: arrow, className: 'route-arrow-icon', iconSize: [24, 24], iconAnchor: [12, 12] }), zIndexOffset: (route.legs.length - index) * 100, interactive: false, keyboard: false }).addTo(layer);
          break;
        }
      }
      if (index === 0) {
        const origin = document.createElement('span'); origin.className = 'route-origin-pin'; origin.textContent = 'A';
        L.marker(points[0], { icon: L.divIcon({ html: origin, className: 'route-origin-icon', iconSize: [27, 27], iconAnchor: [13, 13] }), title: `A: ${route.origin_label}` }).bindTooltip(`Xuất phát: ${route.origin_label}`).addTo(layer);
      }
    });
    if (!bounds.isValid()) return;
    instance.stop();
    const mobile = window.innerWidth <= 760;
    instance.fitBounds(bounds, { paddingTopLeft: [mobile ? 35 : 55, mobile ? 175 : 250], paddingBottomRight: [mobile ? 45 : 300, mobile ? instance.getSize().y * 0.25 + 75 : 55], maxZoom: 16 });
  }, [route, itinerary]);

  return <><div ref={element} className="map" aria-label="Bản đồ các địa điểm tại Thành phố Hồ Chí Minh" /><MapCredits/>
    {route && <aside className="route-map-legend" aria-label="Thứ tự đường đi"><strong>Xuất phát A → {route.legs.map((_, index) => index + 1).join(' → ')}</strong><ol>{route.legs.map((_, index) => <li key={index}><span style={{ backgroundColor: route_leg_color(route.profile, index) }}>{index + 1}</span>{itinerary.find(poi => poi.id === route.stop_ids?.[index])?.name ?? `Điểm ${index + 1}`}</li>)}</ol></aside>}
  </>;
}
