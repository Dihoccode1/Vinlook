import type { usePoiForm } from './usePoiForm';
type Props = Pick<
  ReturnType<typeof usePoiForm>,
  | 'form'
  | 'set_form'
  | 'matches'
  | 'set_matches'
  | 'location_note'
  | 'set_location_note'
  | 'set_address_revision'
  | 'set'
  | 'choose_location'
  | 'LANGUAGE_NAMES'
  | 'categories'
>;
export function PoiLocationFields({
  form,
  set_form,
  matches,
  set_matches,
  location_note,
  set_location_note,
  set_address_revision,
  set,
  choose_location,
  LANGUAGE_NAMES,
  categories,
}: Props) {
  return (
    <>
      <div className="editor-section">
        <h3>
          01 <span>Thông tin cơ bản & Vị trí</span>
        </h3>
        <label>
          Tên điểm tham quan
          <input
            required
            maxLength={200}
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Ví dụ: Chợ Bến Thành"
          />
        </label>

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
            <select
              value={form.source_language}
              onChange={(event) => set('source_language', event.target.value)}
            >
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
          {location_note ||
            'Tọa độ địa lý sẽ được điền tự động; bạn vẫn có thể chỉnh sửa thủ công bên dưới.'}
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
          Dữ liệu tra cứu:{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>
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
    </>
  );
}
