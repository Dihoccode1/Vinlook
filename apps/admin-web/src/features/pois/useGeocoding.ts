import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { api } from '../../services/api';
import type { AddressMatch } from '../../types';
interface Form {
  name: string;
  description: string;
  visitor_description: string;
  address: string;
  latitude: string;
  longitude: string;
  category: string;
  source_language: string;
  is_published: boolean;
  image_credit: string;
  image_source_url: string;
  image_license_url: string;
}
export function useGeocoding(
  form: Form,
  set_form: Dispatch<SetStateAction<Form>>,
  saving: boolean,
  initial_address: string,
) {
  const [locating, set_locating] = useState(false);
  const [matches, set_matches] = useState<AddressMatch[]>([]);
  const [location_note, set_location_note] = useState('');

  const lookup_version = useRef(0);
  const request_running = useRef(false);
  const queued_lookup = useRef(false);
  const last_address = useRef(initial_address.trim());
  const [address_revision, set_address_revision] = useState(0);
  const locate_ref = useRef<() => Promise<void>>(async () => {});

  // Tự động tìm kiếm tọa độ sau khi người dùng dừng gõ địa chỉ 1.2 giây (Debounce)
  useEffect(() => {
    if (!address_revision) return;
    const timer = window.setTimeout(() => void locate_ref.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [address_revision]);

  useEffect(
    () => () => {
      lookup_version.current++;
      queued_lookup.current = false;
    },
    [],
  );

  const set = (key: keyof typeof form, value: string | boolean) => {
    if (key === 'latitude' || key === 'longitude') {
      lookup_version.current++;
      queued_lookup.current = false;
      last_address.current = form.address.trim();
      set_locating(false);
      set_matches([]);
      set_location_note('Đang sử dụng tọa độ bạn nhập thủ công.');
    }
    set_form((previous) => ({ ...previous, [key]: value }));
  };

  function choose_location(match: AddressMatch) {
    set_form((previous) => ({
      ...previous,
      latitude: String(match.latitude),
      longitude: String(match.longitude),
    }));
    set_matches([]);
    set_location_note(`Đã chọn tọa độ: ${match.label}`);
  }

  /**
   * Tra cứu tọa độ địa lý qua OpenStreetMap Nominatim
   */
  async function locate() {
    const address = form.address.trim();
    if (saving || address === last_address.current) return;
    if (address.length < 5) {
      set_location_note('Nhập đầy đủ số nhà, tên đường và tỉnh/thành phố để tra cứu tọa độ.');
      return;
    }
    if (request_running.current) {
      queued_lookup.current = true;
      set_locating(true);
      set_location_note('Đang chờ tra cứu địa chỉ mới nhất...');
      return;
    }

    request_running.current = true;
    last_address.current = address;
    const version = ++lookup_version.current;
    set_locating(true);
    set_matches([]);
    set_location_note('Đang tìm tọa độ địa lý...');

    try {
      const response = await api<{ data: AddressMatch[] }>(
        `/geocode?address=${encodeURIComponent(address)}`,
      );
      if (lookup_version.current !== version) return;

      if (!response.data.length) {
        set_location_note('Không tìm thấy tọa độ tự động. Bạn vui lòng nhập tọa độ thủ công.');
        return;
      }

      if (response.data.length === 1) {
        choose_location(response.data[0]);
      } else {
        set_matches(response.data);
        set_location_note('Tìm thấy nhiều vị trí phù hợp, vui lòng bấm chọn bên dưới:');
      }
    } catch {
      if (lookup_version.current === version) {
        set_location_note('Lỗi kết nối dịch vụ định vị. Bạn vui lòng nhập tọa độ thủ công.');
      }
    } finally {
      request_running.current = false;
      if (lookup_version.current === version) {
        set_locating(false);
      }
      if (queued_lookup.current) {
        queued_lookup.current = false;
        void locate();
      }
    }
  }

  locate_ref.current = locate;

  return {
    locating,
    matches,
    set_matches,
    location_note,
    set_location_note,
    set_address_revision,
    set,
    choose_location,
  };
}
