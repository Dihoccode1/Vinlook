import { Alert } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@vinlook/ui/dialog';
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) on_close();
      }}
    >
      <DialogContent
        ref={dialog}
        showCloseButton={false}
        aria-labelledby="editor-title"
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
        className="w-[min(94vw,690px)] max-w-[690px] gap-0 overflow-hidden rounded-[20px] border-[#e2e8dc] bg-[#fffefb] p-0 shadow-[0_24px_70px_#14372128] [--editor-h:min(var(--editor-visible-height,100svh),100svh)] max-md:fixed max-md:inset-x-3 max-md:top-[calc(var(--editor-visible-top,0px)+12px+env(safe-area-inset-top,0px))] max-md:bottom-auto max-md:left-1/2 max-md:w-[calc(100%-24px)] max-md:max-h-[calc(var(--editor-h)-24px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] max-md:-translate-x-1/2 max-md:translate-y-0 md:max-h-[88dvh]"
      >
        <form
          onSubmit={save}
          className="grid max-h-[inherit] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e5ebe0] px-5 py-4.5 sm:px-7 sm:py-5">
            <div>
              <DialogTitle id="editor-title" className="text-xl font-semibold text-[#173329]">
                {poi ? 'Chỉnh sửa điểm tham quan' : 'Thêm điểm tham quan mới'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[#7c8b74]">
                Cập nhật thông tin, hình ảnh và nội dung thuyết minh.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-[10px] border-[#dce4d7] text-[#385344]"
              type="button"
              aria-label="Đóng cửa sổ"
              disabled={saving}
              onClick={on_close}
            >
              ✕
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain px-5 py-5 [scrollbar-color:#c5d1bf_transparent] [scrollbar-width:thin] sm:px-7">
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
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e2e8dc] bg-[#f8faf4] p-4">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => set('is_published', event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#174c3c]"
              />
              <span className="grid gap-1">
                <strong className="text-xs font-semibold text-foreground md:text-[13px]">
                  Xuất bản lên bản đồ du lịch
                </strong>
                <small className="text-[11px] leading-relaxed text-[#7c8b74]">
                  Bỏ chọn để lưu dưới dạng bản nháp nội bộ, chưa hiển thị cho du khách.
                </small>
              </span>
            </label>

            {error && (
              <Alert variant="destructive" role="alert" className="text-xs leading-relaxed">
                {error}
              </Alert>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2.5 border-t border-[#e5ebe0] bg-[#fffefb] px-5 py-4 sm:px-7">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={on_close}
              className="h-10 rounded-lg border-[#dce3d6] px-4 text-xs font-medium text-[#475d45]"
            >
              Hủy bỏ
            </Button>
            <Button
              disabled={saving || locating || matches.length > 0}
              type="submit"
              className="h-10 rounded-lg px-4 text-xs font-semibold"
            >
              {saving ? 'Đang lưu...' : poi ? 'Lưu thay đổi' : 'Tạo điểm tham quan'}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
