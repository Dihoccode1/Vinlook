import { PoiImageFields } from './PoiImageFields';
import { PoiContentFields } from './PoiContentFields';
import { PoiLocationFields } from './PoiLocationFields';
/**
 * @file PoiEditor.tsx
 * @description Phân hệ Quản lý Điểm tham quan (POI Editor Feature)
 * Cho phép tạo mới, chỉnh sửa thông tin POI, tải ảnh, tự động tra cứu tọa độ địa lý (Geocoding)
 * và phân tách thông tin hiển thị cho khách du lịch với nội dung kịch bản audio thuyết minh.
 */

import type { Poi } from '../../types';

/**
 * Danh mục ngôn ngữ nguồn hỗ trợ thuyết minh với tên hiển thị chuẩn tiếng Việt
 */

interface PoiEditorProps {
  poi: Poi | null;
  on_close: () => void;
  on_saved: () => void;
}

import { usePoiForm } from './usePoiForm';
export function PoiEditor({ poi, on_close, on_saved }: PoiEditorProps) {
  const {
    dialog,
    form,
    set_form,
    file,
    set_file,
    preview,
    error,
    set_error,
    saving,
    locating,
    matches,
    set_matches,
    location_note,
    set_location_note,
    set_address_revision,
    set,
    choose_location,
    save,
    LANGUAGE_NAMES,
    categories,
  } = usePoiForm({ poi, on_close, on_saved });
  return (
    <dialog ref={dialog} className="editor-dialog" aria-labelledby="editor-title">
      <form onSubmit={save}>
        <header className="editor-header">
          <div>
            <h2 id="editor-title">
              {poi ? 'Chỉnh sửa điểm tham quan' : 'Thêm điểm tham quan mới'}
            </h2>
            <p>Cập nhật thông tin, hình ảnh và nội dung thuyết minh.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Đóng cửa sổ"
            disabled={saving}
            onClick={on_close}
          >
            ✕
          </button>
        </header>

        <div className="editor-body">
          {/* Phần 1: Thông tin cơ bản & Định vị */}
          <PoiLocationFields
            form={form}
            set_form={set_form}
            matches={matches}
            set_matches={set_matches}
            location_note={location_note}
            set_location_note={set_location_note}
            set_address_revision={set_address_revision}
            set={set}
            choose_location={choose_location}
            LANGUAGE_NAMES={LANGUAGE_NAMES}
            categories={categories}
          />
          {/* Phần 2: Nội dung giới thiệu & Bài thuyết minh */}
          <PoiContentFields form={form} set={set} />
          {/* Phần 3: Ảnh tư liệu minh họa */}
          <PoiImageFields
            form={form}
            file={file}
            set_file={set_file}
            preview={preview}
            set_error={set_error}
            set={set}
            poi={poi}
          />
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
          <button
            className="primary"
            disabled={saving || locating || matches.length > 0}
            type="submit"
          >
            {saving ? 'Đang lưu...' : poi ? 'Lưu thay đổi' : 'Tạo điểm tham quan'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
