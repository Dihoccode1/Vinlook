import { Input } from '@vinlook/ui/input';
import type { usePoiForm } from './usePoiForm';
type Props = Pick<
  ReturnType<typeof usePoiForm>,
  'form' | 'file' | 'set_file' | 'preview' | 'set_error' | 'set' | 'poi'
>;
export function PoiImageFields({ form, file, set_file, preview, set_error, set, poi }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="m-0 flex items-center gap-2 text-xs font-medium text-[#8a987e]">
        <span className="font-mono text-[11px]">03</span>
        <span className="text-[13px] font-semibold text-[#2d473a]">Ảnh minh họa</span>
      </h3>
      {(preview || poi?.image_url) && (
        <img
          className="h-44 w-full rounded-xl border border-[#e2e8dc] object-cover"
          src={preview || `${poi?.image_url}?v=${encodeURIComponent(poi?.updated_at ?? '')}`}
          alt="Ảnh minh họa điểm tham quan"
        />
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#d6e0d2] bg-[#f7f9f4] px-3.5 py-2 text-xs font-medium text-[#2d473a] transition-colors hover:bg-[#edf3e6] focus-within:ring-[3px] focus-within:ring-ring">
        <span>Chọn ảnh mới</span>
        <input
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const next = event.target.files?.[0];
            if (
              next &&
              (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) ||
                next.size > 5242880)
            ) {
              set_error('Vui lòng chọn ảnh định dạng JPG, PNG hoặc WebP có dung lượng dưới 5 MB.');
              event.target.value = '';
              return;
            }
            set_file(next ?? null);
            set_error('');
          }}
        />
      </label>
      <p className="m-0 text-[11px] leading-relaxed text-[#82917b]">
        Định dạng JPG, PNG hoặc WebP • Tối đa 5 MB • Lưu trữ an toàn trong cơ sở dữ liệu.
      </p>

      <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
        <span>Tác giả / Ghi công bản quyền ảnh</span>
        <Input
          required={!!file}
          maxLength={300}
          value={form.image_credit}
          onChange={(event) => set('image_credit', event.target.value)}
          placeholder="Tên tác giả • Nguồn giấy phép (ví dụ: CC BY-SA 4.0)"
          className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
        />
      </label>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
          <span>Đường dẫn nguồn ảnh gốc</span>
          <Input
            type="url"
            maxLength={2048}
            value={form.image_source_url}
            onChange={(event) => set('image_source_url', event.target.value)}
            placeholder="https://..."
            className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
          <span>Đường dẫn giấy phép bản quyền</span>
          <Input
            type="url"
            maxLength={2048}
            value={form.image_license_url}
            onChange={(event) => set('image_license_url', event.target.value)}
            placeholder="https://creativecommons.org/..."
            className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
          />
        </label>
      </div>
    </div>
  );
}
