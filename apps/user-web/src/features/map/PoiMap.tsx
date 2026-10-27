import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Poi } from '../../types/poi';

interface Props { pois: Poi[]; selected: Poi | null; onSelect: (poi: Poi) => void }

export function PoiMap({ pois, selected, onSelect }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { zoomControl: false }).setView([10.777, 106.698], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(instance);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    map.current = instance;
    markers.current = L.layerGroup().addTo(instance);
    return () => { instance.remove(); map.current = null; markers.current = null; };
  }, []);

  useEffect(() => {
    const layer = markers.current;
    if (!layer) return;
    layer.clearLayers();
    for (const poi of pois) {
      const label = document.createElement('span');
      label.textContent = poi.name;
      L.circleMarker([poi.latitude, poi.longitude], {
        radius: poi.id === selected?.id ? 13 : 9,
        color: '#ffffff', weight: 3, fillColor: poi.id === selected?.id ? '#d97732' : '#174c3c', fillOpacity: 1,
      }).bindTooltip(label).on('click', () => onSelect(poi)).addTo(layer);
    }
  }, [pois, selected, onSelect]);

  useEffect(() => {
    if (selected) map.current?.flyTo([selected.latitude, selected.longitude], 16, { duration: 0.6 });
  }, [selected]);

  return <div ref={element} className="map" aria-label="Bản đồ các địa điểm tại Thành phố Hồ Chí Minh" />;
}
