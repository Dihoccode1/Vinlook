import { useEffect, useRef, useState } from 'react';
export function useNearbyLocation(locale) {
  const [position, setPosition] = useState(null),
    [gpsStatus, setGpsStatus] = useState('idle');
  const geoRequest = useRef(0);
  useEffect(() => {
    geoRequest.current++;
    setGpsStatus((previous) => (previous === 'loading' ? 'idle' : previous));
  }, [locale]);
  function locate(onLocated) {
    const request = ++geoRequest.current;
    setGpsStatus('loading');
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (value) => {
        if (request !== geoRequest.current) return;
        setPosition({ lon: value.coords.longitude, lat: value.coords.latitude });
        setGpsStatus('ready');
        onLocated();
      },
      (error) => {
        if (request === geoRequest.current)
          setGpsStatus(error.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 },
    );
  }

  return { position, gpsStatus, locate };
}
