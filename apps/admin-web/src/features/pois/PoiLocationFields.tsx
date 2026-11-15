import { Button } from '@vinlook/ui/button';
import { Input } from '@vinlook/ui/input';
import { Select } from '@vinlook/ui/select';
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
    <div className="space-y-4 border-b border-[#e9eee3] pb-6">
      <h3 className="m-0 flex items-center gap-2 text-xs font-medium text-[#8a987e]">
        <span className="font-mono text-[11px]">01</span>
        <span className="text-[13px] font-semibold text-[#2d473a]">
          Thông tin cơ bản &amp; Vị trí
        </span>
      </h3>
      <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
        <span>Tên điểm tham quan</span>
        <Input
          required
          maxLength={200}
          value={form.name}
          onChange={(event) => set('name', event.target.value)}
          placeholder="Ví dụ: Chợ Bến Thành"
          className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
        />
      </label>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
          <span>Danh mục</span>
          <Select
            value={form.category}
            onChange={(event) => set('category', event.target.value)}
            className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
          >
            {Object.entries(categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
          <span>Ngôn ngữ gốc của kịch bản</span>
          <Select
            value={form.source_language}
            onChange={(event) => set('source_language', event.target.value)}
            className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
          >
            {Object.entries(LANGUAGE_NAMES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
        <span>Địa chỉ thực tế</span>
        <Input
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
          className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
        />
      </label>

      <p className="m-0 text-[11px] leading-relaxed text-[#82917b]" role="status">
        {location_note ||
          'Tọa độ địa lý sẽ được điền tự động; bạn vẫn có thể chỉnh sửa thủ công bên dưới.'}
      </p>

      {matches.length > 0 && (
        <div className="grid gap-1.5" aria-label="Chọn vị trí phù hợp">
          {matches.map((match, index) => (
            <Button
              type="button"
              variant="outline"
              key={index}
              onClick={() => choose_location(match)}
              className="h-auto flex-col items-start gap-0.5 rounded-lg border-[#dce4d7] bg-[#f8faf4] px-3 py-2 text-left text-xs whitespace-normal hover:bg-[#edf3e6]"
            >
              <span className="font-medium text-foreground">{match.label}</span>
              <small className="text-[11px] text-[#7c8b74]">
                {match.latitude}, {match.longitude}
              </small>
            </Button>
          ))}
        </div>
      )}

      <p className="m-0 text-[11px] text-[#82917b]">
        Dữ liệu tra cứu:{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="text-[#4b6a56] underline"
        >
          © OpenStreetMap contributors
        </a>
      </p>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
          <span>Vĩ độ (Latitude)</span>
          <Input
            required
            type="number"
            min={-90}
            max={90}
            step="any"
            value={form.latitude}
            onChange={(event) => set('latitude', event.target.value)}
            className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
          <span>Kinh độ (Longitude)</span>
          <Input
            required
            type="number"
            min={-180}
            max={180}
            step="any"
            value={form.longitude}
            onChange={(event) => set('longitude', event.target.value)}
            className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
          />
        </label>
      </div>
    </div>
  );
}
