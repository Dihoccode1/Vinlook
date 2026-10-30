export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface TrackingSnapshot {
  status: 'idle' | 'locating' | 'tracking' | 'error';
  active: boolean;
  position: LocationFix | null;
  error: string | null;
}

export interface LocationEnvironment {
  secure_context: boolean;
  geolocation?: Pick<Geolocation, 'watchPosition' | 'clearWatch'>;
}

const initial: TrackingSnapshot = { status: 'idle', active: false, position: null, error: null };

export function create_location_tracker(environment: LocationEnvironment) {
  let snapshot = initial;
  let generation = 0;
  let watch_id: number | undefined;
  const listeners = new Set<() => void>();

  function update(next: TrackingSnapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function clear() {
    generation++;
    if (watch_id !== undefined) environment.geolocation?.clearWatch(watch_id);
    watch_id = undefined;
  }

  return {
    get_snapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    start() {
      if (snapshot.active) return;
      clear();
      if (!environment.secure_context || !environment.geolocation) {
        update({ ...initial, status: 'error', error: !environment.secure_context
          ? 'Định vị cần HTTPS hoặc localhost. Hãy mở ứng dụng bằng kết nối an toàn.'
          : 'Trình duyệt này không hỗ trợ định vị.' });
        return;
      }
      const current = generation;
      update({ ...initial, position: snapshot.position, active: true, status: 'locating' });
      try {
        const id = environment.geolocation.watchPosition(position => {
          if (generation !== current) return;
          const { latitude, longitude, accuracy } = position.coords;
          const timestamp = position.timestamp;
          if (![latitude, longitude, accuracy, timestamp].every(Number.isFinite)
            || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0 || timestamp < 0) {
            update({ ...snapshot, status: 'error', error: 'Dữ liệu vị trí chưa hợp lệ. Đang chờ cập nhật GPS mới.' });
            return;
          }
          if (snapshot.position && timestamp < snapshot.position.timestamp) return;
          update({ status: 'tracking', active: true, position: { latitude, longitude, accuracy, timestamp }, error: null });
        }, error => {
          if (generation !== current) return;
          if (error.code === 1) {
            clear();
            update({ ...initial, status: 'error', error: 'Quyền vị trí đã bị từ chối. Bật quyền vị trí cho trang và trình duyệt trong cài đặt điện thoại, rồi bấm Về vị trí của tôi. Nếu mở từ Zalo/Facebook, hãy mở link bằng Chrome hoặc Safari.' });
          } else {
            update({ ...snapshot, status: 'error', error: error.code === 3
              ? 'Chưa lấy được vị trí trong thời gian chờ. GPS vẫn đang thử cập nhật.'
              : 'Tạm thời không xác định được vị trí. Bật Vị trí/GPS trên điện thoại và kiểm tra kết nối. Nếu mở từ Zalo/Facebook, hãy thử mở link bằng Chrome hoặc Safari.' });
          }
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
        // Covers permission callbacks that complete before watchPosition returns.
        if (generation !== current) environment.geolocation.clearWatch(id);
        else watch_id = id;
      } catch {
        clear();
        update({ ...initial, status: 'error', error: 'Không thể bật định vị. Kiểm tra quyền vị trí của trình duyệt.' });
      }
    },
    stop() {
      clear();
      update(initial);
    },
    refresh() {
      if (!snapshot.active) return;
      clear();
      update({ ...snapshot, active: false });
      this.start();
    },
  };
}
