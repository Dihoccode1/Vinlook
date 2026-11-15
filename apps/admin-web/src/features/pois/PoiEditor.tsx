import { NativeDialog } from '@vinlook/ui/dialog';
import { Button } from '@vinlook/ui/button';
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
    <NativeDialog ref={dialog} className="editor-dialog" aria-labelledby="editor-title">
      <form onSubmit={save}>
        <header className="editor-header flex items-center justify-between">
          <div>
            <h2 id="editor-title">
              {poi ? 'Chỉnh sửa điểm tham quan' : 'Thêm điểm tham quan mới'}
            </h2>
            <p>Cập nhật thông tin, hình ảnh và nội dung thuyết minh.</p>
          </div>
          <Button
            variant="custom"
            className="icon-button leading-[30px]"
            type="button"
            aria-label="Đóng cửa sổ"
            disabled={saving}
            onClick={on_close}
          >
            ✕
          </Button>
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
          <label className="publish-option items-start p-[15px] bg-[#eff4e7]">
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
            <p
              className="error-banner py-[13px] px-[15px] bg-[#fff0e8] text-[#a65d40] rounded-[8px]"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="editor-footer flex justify-end [@media(max-width:_760px)]:relative [@media(max-width:_760px)]:z-[1] [@media(max-width:_760px)]:shadow-[0_-4px_12px_#153f3206]">
          <Button variant="custom" type="button" disabled={saving} onClick={on_close}>
            Hủy bỏ
          </Button>
          <Button
            variant="custom"
            className="primary"
            disabled={saving || locating || matches.length > 0}
            type="submit"
          >
            {saving ? 'Đang lưu...' : poi ? 'Lưu thay đổi' : 'Tạo điểm tham quan'}
          </Button>
        </footer>
      </form>
    </NativeDialog>
  );
}
