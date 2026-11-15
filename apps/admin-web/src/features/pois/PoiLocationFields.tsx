import { Button } from '@vinlook/ui/button';
import { NativeSelect } from '@vinlook/ui/native-select';
import { Input } from '@vinlook/ui/input';
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
          <Input
            appearance="custom"
            required
            maxLength={200}
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Ví dụ: Chợ Bến Thành"
          />
        </label>

        <div className="form-grid grid">
          <label>
            Danh mục
            <NativeSelect
              value={form.category}
              onChange={(event) => set('category', event.target.value)}
            >
              {Object.entries(categories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label>
            Ngôn ngữ gốc của kịch bản
            <NativeSelect
              value={form.source_language}
              onChange={(event) => set('source_language', event.target.value)}
            >
              {Object.entries(LANGUAGE_NAMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>

        <label>
          Địa chỉ thực tế
          <Input
            appearance="custom"
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

        <p className="field-note text-[#a1a98f]" role="status">
          {location_note ||
            'Tọa độ địa lý sẽ được điền tự động; bạn vẫn có thể chỉnh sửa thủ công bên dưới.'}
        </p>

        {matches.length > 0 && (
          <div
            className="geocode-matches grid gap-[7px] my-[10px] mx-[0]"
            aria-label="Chọn vị trí phù hợp"
          >
            {matches.map((match, index) => (
              <Button
                variant="custom"
                type="button"
                key={index}
                onClick={() => choose_location(match)}
              >
                {match.label}
                <small>
                  {match.latitude}, {match.longitude}
                </small>
              </Button>
            ))}
          </div>
        )}

        <p className="field-note text-[#a1a98f]">
          Dữ liệu tra cứu:{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>
        </p>

        <div className="form-grid grid">
          <label>
            Vĩ độ (Latitude)
            <Input
              appearance="custom"
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
            <Input
              appearance="custom"
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
