import { Textarea } from '@vinlook/ui/textarea';
import type { usePoiForm } from './usePoiForm';
type Props = Pick<ReturnType<typeof usePoiForm>, 'form' | 'set'>;
export function PoiContentFields({ form, set }: Props) {
  return (
    <div className="space-y-4 border-b border-[#e9eee3] pb-6">
      <h3 className="m-0 flex items-center gap-2 text-xs font-medium text-[#8a987e]">
        <span className="font-mono text-[11px]">02</span>
        <span className="text-[13px] font-semibold text-[#2d473a]">
          Giới thiệu &amp; Thuyết minh
        </span>
      </h3>
      <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
        <span>Thông tin giới thiệu ngắn (Hiển thị cho du khách trên thẻ điểm đến)</span>
        <Textarea
          maxLength={3000}
          rows={4}
          value={form.visitor_description}
          onChange={(event) => set('visitor_description', event.target.value)}
          placeholder="Giới thiệu tóm tắt điểm nổi bật, giờ mở cửa, lưu ý khi tham quan..."
          className="rounded-[9px] border-[#d6e0d2] bg-white text-base leading-relaxed md:text-[13px]"
        />
      </label>
      <p className="m-0 text-[11px] leading-relaxed text-[#82917b]">
        Nội dung này hiển thị trực tiếp trên thẻ POI của du khách, tách biệt với file audio.
      </p>

      <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
        <span>Kịch bản thuyết minh gốc (Dùng làm tư liệu dịch và tạo audio)</span>
        <Textarea
          required
          maxLength={20000}
          rows={8}
          value={form.description}
          onChange={(event) => set('description', event.target.value)}
          placeholder="Viết câu chuyện lịch sử, kiến trúc, giá trị văn hóa để thuyết minh..."
          className="rounded-[9px] border-[#d6e0d2] bg-white text-base leading-relaxed md:text-[13px]"
        />
      </label>
      <p className="m-0 text-[11px] leading-relaxed text-[#82917b]">
        Thay đổi bài thuyết minh sẽ yêu cầu cập nhật lại bản dịch và giọng đọc.
      </p>
    </div>
  );
}
