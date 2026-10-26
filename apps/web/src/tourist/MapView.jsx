import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
const protocol = new Protocol();
maplibregl.setWorkerUrl(workerUrl);
maplibregl.addProtocol('pmtiles', protocol.tile);
export function MapView({ styleUrl, items, selectedId, position, route = null, onSelect, labels }) {
  const container = useRef(null),
    instance = useRef(null),
    markers = useRef([]),
    gps = useRef(null),
    select = useRef(onSelect);
  const [failed, setFailed] = useState(false),
    [loaded, setLoaded] = useState(false),
    [attempt, setAttempt] = useState(0);
  select.current = onSelect;
  useEffect(() => {
    if (!styleUrl) return;
    let map;
    setFailed(false);
    setLoaded(false);
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: styleUrl,
        center: [106.7009, 10.7769],
        zoom: 12,
        attributionControl: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('error', () => setFailed(true));
      map.once('load', () => setLoaded(true));
      instance.current = map;
    } catch {
      setFailed(true);
    }
    return () => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      gps.current?.remove();
      gps.current = null;
      instance.current = null;
      map?.remove();
    };
  }, [styleUrl, attempt]);
  useEffect(() => {
    const map = instance.current;
    if (!map) return;
    markers.current.forEach((m) => m.remove());
    markers.current = items.map((item, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'poi-pin' + (item.id === selectedId ? ' is-selected' : '');
      button.textContent = String(i + 1);
      button.title = item.nameEN;
      button.setAttribute('aria-label', `${labels.view}: ${item.nameEN}`);
      button.addEventListener('click', () => select.current(item.id));
      return new maplibregl.Marker({ element: button, anchor: 'bottom' })
        .setLngLat(item.location.coordinates)
        .addTo(map);
    });
  }, [items, selectedId, styleUrl, labels.view, attempt]);
  useEffect(() => {
    const item = items.find((x) => x.id === selectedId);
    if (item && instance.current)
      instance.current.easeTo({
        center: item.location.coordinates,
        zoom: Math.max(13, instance.current.getZoom()),
        duration: 500,
      });
  }, [selectedId, items, attempt]);
  useEffect(() => {
    gps.current?.remove();
    gps.current = null;
    if (position && instance.current) {
      gps.current = new maplibregl.Marker({ color: '#117267' })
        .setLngLat([position.lon, position.lat])
        .addTo(instance.current);
      instance.current.easeTo({ center: [position.lon, position.lat], duration: 500 });
    }
  }, [position, styleUrl, attempt]);
  useEffect(() => {
    const map = instance.current;
    if (!map || !loaded) return;
    const data = {
      type: 'FeatureCollection',
      features: route?.length
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: route },
            },
          ]
        : [],
    };
    if (!map.getSource('vinlook-walking-route')) {
      map.addSource('vinlook-walking-route', { type: 'geojson', data });
      map.addLayer({
        id: 'vinlook-walking-route',
        type: 'line',
        source: 'vinlook-walking-route',
        paint: { 'line-color': '#117267', 'line-width': 5, 'line-opacity': 0.9 },
      });
    } else map.getSource('vinlook-walking-route').setData(data);
    if (route?.length) {
      const bounds = new maplibregl.LngLatBounds();
      route.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 500 });
    }
  }, [route, loaded, attempt]);
  return (
    <div className="tour-map" dir="ltr" data-ready={loaded && !failed}>
      <div ref={container} className="tour-map-canvas" aria-label={labels.map} />
      <div className="map-license">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap contributors
        </a>{' '}
        ·{' '}
        <a
          href="https://github.com/Dihoccode1/Vinlook/releases/tag/poc-hcmc-r2-20261027-v1"
          target="_blank"
          rel="noreferrer"
        >
          Graph / ODbL
        </a>
      </div>
      {(!styleUrl || failed) && (
        <div className="map-source-note" role="status">
          <span aria-hidden="true">◇</span>
          <p>{styleUrl ? labels.error : labels.mapMissing}</p>
          {styleUrl && failed && (
            <button style={{ pointerEvents: 'auto' }} onClick={() => setAttempt((n) => n + 1)}>
              {labels.retry}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
