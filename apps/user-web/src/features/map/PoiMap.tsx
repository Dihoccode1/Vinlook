import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Poi } from '../../types/poi';
import type { LocationFix } from '../tracking/location-tracker';
import { placeholderImage, poiImageUrl } from '../poi/image-url';
import type { PlannedRoute } from '../navigation/types';

interface Props {
  pois: Poi[];
  selected: Poi | null;
  onSelect: (poi: Poi) => void;
  position: LocationFix | null;
  stale: boolean;
  following: boolean;
  locationFocus: number;
  onManualMove: () => void;
  route: PlannedRoute | null;
}

export function PoiMap({ pois, selected, onSelect, position, stale, following, locationFocus, onManualMove, route }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const locationLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { zoomControl: false }).setView([10.777, 106.698], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(instance);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    instance.attributionControl.addAttribution('<a href="/images/pois/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">Ảnh POI: Riza, P. Hughes, Prenn · CC</a>');
    map.current = instance;
    markers.current = L.layerGroup().addTo(instance);
    locationLayer.current = L.layerGroup().addTo(instance);
    routeLayer.current = L.layerGroup().addTo(instance);
    return () => { instance.remove(); map.current = null; markers.current = null; locationLayer.current = null; routeLayer.current = null; };
  }, []);

  useEffect(() => {
    const layer = markers.current;
    if (!layer) return;
    layer.clearLayers();
    for (const poi of pois) {
      const label = document.createElement('span');
      label.textContent = poi.name;
      const element = document.createElement('div');
      element.className = `poi-photo-pin ${poi.id === selected?.id ? 'is-selected' : ''}`;
      const photo = document.createElement('img');
      photo.src = poiImageUrl(poi.imageUrl);
      photo.alt = poi.name;
      photo.referrerPolicy = 'no-referrer';
      photo.decoding = 'async';
      photo.addEventListener('error', () => { photo.src = placeholderImage; }, { once: true });
      element.appendChild(photo);
      const marker = L.marker([poi.latitude, poi.longitude], {
        icon: L.divIcon({ html: element, className: 'poi-photo-icon', iconSize: [64, 64], iconAnchor: [32, 64], tooltipAnchor: [0, -64] }),
        title: poi.name,
        alt: `Xem ${poi.name}`,
        riseOnHover: true,
        zIndexOffset: poi.id === selected?.id ? 1000 : 0,
      });
      marker.bindTooltip(label).on('click', () => onSelect(poi)).addTo(layer);
    }
  }, [pois, selected, onSelect]);

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
    instance.on('dragstart', onManualMove);
    return () => { instance.off('dragstart', onManualMove); };
  }, [onManualMove]);

  useEffect(() => {
    const layer = locationLayer.current;
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
  }, [following, position, stale, locationFocus]);

  useEffect(() => {
    const layer = routeLayer.current;
    const instance = map.current;
    if (!layer || !instance) return;
    layer.clearLayers();
    if (!route) return;
    const points: L.LatLngExpression[] = route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]);
    const color = route.profile === 'motorcycle' ? '#20855b' : route.profile === 'bus' ? '#7950b5' : '#2677ce';
    L.polyline(points, { color: '#ffffff', weight: 9, opacity: 0.9, interactive: false }).addTo(layer);
    const line = L.polyline(points, { color, weight: 5, opacity: 1, interactive: false }).addTo(layer);
    L.circleMarker(points[0], { radius: 6, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }).bindTooltip('Điểm xuất phát của tuyến').addTo(layer);
    instance.stop();
    instance.fitBounds(line.getBounds(), { paddingTopLeft: [45, 95], paddingBottomRight: [45, 45], maxZoom: 16 });
  }, [route]);

  return <div ref={element} className="map" aria-label="Bản đồ các địa điểm tại Thành phố Hồ Chí Minh" />;
}
