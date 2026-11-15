import type { usePoiForm } from './usePoiForm';
type Props = Pick<
  ReturnType<typeof usePoiForm>,
  'form' | 'file' | 'set_file' | 'preview' | 'set_error' | 'set' | 'poi'
>;
export function PoiImageFields({ form, file, set_file, preview, set_error, set, poi }: Props) {
  return (
    <>
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
              if (
                next &&
                (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) ||
                  next.size > 5242880)
              ) {
                set_error(
                  'Vui lòng chọn ảnh định dạng JPG, PNG hoặc WebP có dung lượng dưới 5 MB.',
                );
                event.target.value = '';
                return;
              }
              set_file(next ?? null);
              set_error('');
            }}
          />
        </label>
        <p className="field-note">
          Định dạng JPG, PNG hoặc WebP • Tối đa 5 MB • Lưu trữ an toàn trong cơ sở dữ liệu.
        </p>

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
    </>
  );
}
