/**
 * @file PoiEditor.tsx
 * @description Phân hệ Quản lý Điểm tham quan (POI Editor Feature)
 * Cho phép tạo mới, chỉnh sửa thông tin POI, tải ảnh, tự động tra cứu tọa độ địa lý (Geocoding)
 * và phân tách thông tin hiển thị cho khách du lịch với nội dung kịch bản audio thuyết minh.
 */

import React, { useEffect, useRef, useState } from 'react';
import { api, categories } from '../../services/api';
import type { Poi, AddressMatch } from '../../types';

/**
 * Danh mục ngôn ngữ nguồn hỗ trợ thuyết minh với tên hiển thị chuẩn tiếng Việt
 */
const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  'zh-CN': '简体中文',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  ar: 'العربية',
  hi: 'हिन्दी'
};

/**
 * Hàm chuẩn hóa chuỗi tiêu đề thành slug URL an toàn
 */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface PoiEditorProps {
  poi: Poi | null;
  on_close: () => void;
  on_saved: () => void;
}

export function PoiEditor({ poi, on_close, on_saved }: PoiEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [form, set_form] = useState({
    name: poi?.name ?? '',
    slug: poi?.slug ?? '',
    description: poi?.description ?? '',
    address: poi?.address ?? '',
    visitor_description: poi?.visitor_description ?? '',
    latitude: poi ? String(poi.latitude) : '',
    longitude: poi ? String(poi.longitude) : '',
    category: poi?.category ?? 'architecture',
    source_language: poi?.source_language ?? 'vi',
    is_published: poi?.is_published ?? false,
    image_credit: poi?.image_credit ?? '',
    image_source_url: poi?.image_source_url ?? '',
    image_license_url: poi?.image_license_url ?? ''
  });

  const [file, set_file] = useState<File | null>(null);
  const [preview, set_preview] = useState('');
  const [error, set_error] = useState('');
  const [saving, set_saving] = useState(false);
  const [locating, set_locating] = useState(false);
  const [matches, set_matches] = useState<AddressMatch[]>([]);
  const [location_note, set_location_note] = useState('');

  const lookup_version = useRef(0);
  const request_running = useRef(false);
  const queued_lookup = useRef(false);
  const last_address = useRef(poi?.address.trim() ?? '');
  const [address_revision, set_address_revision] = useState(0);
  const locate_ref = useRef<() => Promise<void>>(async () => {});

  // Tự động tìm kiếm tọa độ sau khi người dùng dừng gõ địa chỉ 1.2 giây (Debounce)
  useEffect(() => {
    if (!address_revision) return;
    const timer = window.setTimeout(() => void locate_ref.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [address_revision]);

  useEffect(() => () => {
    lookup_version.current++;
    queued_lookup.current = false;
  }, []);

  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);

  // Xử lý chiều cao viewport động (tránh bàn phím ảo che khuất trên mobile/tablet)
  useEffect(() => {
    const element = dialog.current;
    const viewport = window.visualViewport;
    const update_viewport = () => {
      const layout_height = Math.min(
        window.innerHeight,
        document.documentElement.clientHeight || window.innerHeight
      );
      const visible_height = Math.min(viewport?.height ?? layout_height, layout_height);
      element?.style.setProperty('--editor-visible-height', `${visible_height}px`);
      element?.style.setProperty('--editor-visible-top', `${viewport?.offsetTop ?? 0}px`);
    };

    update_viewport();
    viewport?.addEventListener('resize', update_viewport);
    viewport?.addEventListener('scroll', update_viewport);
    window.addEventListener('resize', update_viewport);

    return () => {
      viewport?.removeEventListener('resize', update_viewport);
      viewport?.removeEventListener('scroll', update_viewport);
      window.removeEventListener('resize', update_viewport);
    };
  }, []);

  // Tạo URL xem trước ảnh tải lên
  useEffect(() => {
    if (!file) {
      set_preview('');
      return;
    }
    const url = URL.createObjectURL(file);
    set_preview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
      longitude: String(match.longitude)
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
        `/geocode?address=${encodeURIComponent(address)}`
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

  /**
   * Gửi form lưu dữ liệu POI
   */
  async function save(event: React.FormEvent) {
    event.preventDefault();
    set_error('');

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      set_error('Tọa độ không hợp lệ. Vĩ độ phải từ -90 đến 90, kinh độ từ -180 đến 180.');
      return;
    }

    set_saving(true);

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        visitor_description: form.visitor_description.trim(),
        address: form.address.trim(),
        category: form.category,
        source_language: form.source_language,
        is_published: form.is_published,
        latitude: lat,
        longitude: lng,
        image_credit: form.image_credit.trim() || null,
        image_source_url: form.image_source_url.trim() || null,
        image_license_url: form.image_license_url.trim() || null
      };

      const path = poi ? `/pois/${encodeURIComponent(poi.id)}` : '/pois';
      const method = poi ? 'PUT' : 'POST';
      const result = await api<{ data: Poi }>(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Tải ảnh lên nếu có chọn file mới
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('image_credit', form.image_credit.trim());
        if (form.image_source_url.trim()) formData.append('image_source_url', form.image_source_url.trim());
        if (form.image_license_url.trim()) formData.append('image_license_url', form.image_license_url.trim());

        await api(`/pois/${encodeURIComponent(result.data.id)}/image`, {
          method: 'POST',
          body: formData
        });
      }

      on_saved();
    } catch (failure) {
      set_error(failure instanceof Error ? failure.message : 'Không thể lưu địa điểm.');
    } finally {
      set_saving(false);
    }
  }

  return (
    <dialog ref={dialog} className="editor-dialog" aria-labelledby="editor-title">
      <form onSubmit={save}>
        <header className="editor-header">
          <div>
            <h2 id="editor-title">{poi ? 'Chỉnh sửa điểm tham quan' : 'Thêm điểm tham quan mới'}</h2>
            <p>Cập nhật thông tin, hình ảnh và nội dung thuyết minh.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Đóng cửa sổ" disabled={saving} onClick={on_close}>
            ✕
          </button>
        </header>

        <div className="editor-body">
          {/* Phần 1: Thông tin cơ bản & Định vị */}
          <div className="editor-section">
            <h3>
              01 <span>Thông tin cơ bản & Vị trí</span>
            </h3>
            <div className="form-grid">
              <label>
                Tên điểm tham quan
                <input
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    set_form((previous) => ({
                      ...previous,
                      name,
                      slug: !poi && (!previous.slug || previous.slug === slugify(previous.name)) ? slugify(name) : previous.slug
                    }));
                  }}
                  placeholder="Ví dụ: Chợ Bến Thành"
                />
              </label>

              <label>
                Đường dẫn tĩnh (Slug URL)
                <input
                  required
                  maxLength={100}
                  pattern="[a-z0-9\-]+"
                  value={form.slug}
                  onChange={(event) => set('slug', event.target.value.toLowerCase())}
                  placeholder="cho-ben-thanh"
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Danh mục
                <select value={form.category} onChange={(event) => set('category', event.target.value)}>
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Ngôn ngữ gốc của kịch bản
                <select value={form.source_language} onChange={(event) => set('source_language', event.target.value)}>
                  {Object.entries(LANGUAGE_NAMES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Địa chỉ thực tế
              <input
                required
                maxLength={300}
                value={form.address}
                onChange={(event) => {
                  const address = event.target.value;
                  set_address_revision((v) => v + 1);
                  set_matches([]);
                  set_location_note('Dừng nhập khoảng 1.2 giây để hệ thống tự động tìm tọa độ mới.');
                  set_form((previous) => ({ ...previous, address, latitude: '', longitude: '' }));
                }}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, TP. Hồ Chí Minh"
              />
            </label>

            <p className="field-note" role="status">
              {location_note || 'Tọa độ địa lý sẽ được điền tự động; bạn vẫn có thể chỉnh sửa thủ công bên dưới.'}
            </p>

            {matches.length > 0 && (
              <div className="geocode-matches" aria-label="Chọn vị trí phù hợp">
                {matches.map((match, index) => (
                  <button type="button" key={index} onClick={() => choose_location(match)}>
                    {match.label}
                    <small>
                      {match.latitude}, {match.longitude}
                    </small>
                  </button>
                ))}
              </div>
            )}

            <p className="field-note">
              Dữ liệu tra cứu: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
            </p>

            <div className="form-grid">
              <label>
                Vĩ độ (Latitude)
                <input
                  required
                  type="number"
                  min={-90}
                  max={90}
                  step="any"
                  value={form.latitude}
                  onChange={(event) => set('latitude', event.target.value)}
                />
              </label>

              <label>
                Kinh độ (Longitude)
                <input
                  required
                  type="number"
                  min={-180}
                  max={180}
                  step="any"
                  value={form.longitude}
                  onChange={(event) => set('longitude', event.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Phần 2: Nội dung giới thiệu & Bài thuyết minh */}
          <div className="editor-section">
            <h3>
              02 <span>Giới thiệu & Thuyết minh</span>
            </h3>
            <label>
              Thông tin giới thiệu ngắn (Hiển thị cho du khách trên thẻ điểm đến)
              <textarea
                maxLength={3000}
                rows={4}
                value={form.visitor_description}
                onChange={(event) => set('visitor_description', event.target.value)}
                placeholder="Giới thiệu tóm tắt điểm nổi bật, giờ mở cửa, lưu ý khi tham quan..."
              />
            </label>
            <p className="field-note">Nội dung này hiển thị trực tiếp trên thẻ POI của du khách, tách biệt với file audio.</p>

            <label>
              Kịch bản thuyết minh gốc (Dùng làm tư liệu dịch và tạo audio)
              <textarea
                required
                maxLength={20000}
                rows={8}
                value={form.description}
                onChange={(event) => set('description', event.target.value)}
                placeholder="Viết câu chuyện lịch sử, kiến trúc, giá trị văn hóa để thuyết minh..."
              />
            </label>
            <p className="field-note">
              Thay đổi bài thuyết minh sẽ yêu cầu cập nhật lại bản dịch và giọng đọc.
            </p>
          </div>

          {/* Phần 3: Ảnh tư liệu minh họa */}
          <div className="editor-section">
            <h3>
              03 <span>Ảnh minh họa</span>
            </h3>
            {(preview || poi?.image_url) && (
              <img
                className="editor-photo"
                src={preview || `${poi?.image_url}?v=${encodeURIComponent(poi?.updated_at ?? '')}`}
                alt="Ảnh minh họa điểm tham quan"
              />
            )}

            <label className="file-input">
              Chọn ảnh mới
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next && (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > 5242880)) {
                    set_error('Vui lòng chọn ảnh định dạng JPG, PNG hoặc WebP có dung lượng dưới 5 MB.');
                    event.target.value = '';
                    return;
                  }
                  set_file(next ?? null);
                  set_error('');
                }}
              />
            </label>
            <p className="field-note">Định dạng JPG, PNG hoặc WebP • Tối đa 5 MB • Lưu trữ an toàn trong cơ sở dữ liệu.</p>

            <label>
              Tác giả / Ghi công bản quyền ảnh
              <input
                required={!!file}
                maxLength={300}
                value={form.image_credit}
                onChange={(event) => set('image_credit', event.target.value)}
                placeholder="Tên tác giả • Nguồn giấy phép (ví dụ: CC BY-SA 4.0)"
              />
            </label>

            <div className="form-grid">
              <label>
                Đường dẫn nguồn ảnh gốc
                <input
                  type="url"
                  maxLength={2048}
                  value={form.image_source_url}
                  onChange={(event) => set('image_source_url', event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label>
                Đường dẫn giấy phép bản quyền
                <input
                  type="url"
                  maxLength={2048}
                  value={form.image_license_url}
                  onChange={(event) => set('image_license_url', event.target.value)}
                  placeholder="https://creativecommons.org/..."
                />
              </label>
            </div>
          </div>

          {/* Tùy chọn xuất bản */}
          <label className="publish-option">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) => set('is_published', event.target.checked)}
            />
            <span>
              <strong>Xuất bản lên bản đồ du lịch</strong>
              <small>Bỏ chọn để lưu dưới dạng bản nháp nội bộ, chưa hiển thị cho du khách.</small>
            </span>
          </label>

          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="editor-footer">
          <button type="button" disabled={saving} onClick={on_close}>
            Hủy bỏ
          </button>
          <button className="primary" disabled={saving || locating || matches.length > 0} type="submit">
            {saving ? 'Đang lưu...' : poi ? 'Lưu thay đổi' : 'Tạo điểm tham quan'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
