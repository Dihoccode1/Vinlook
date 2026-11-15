import { Textarea } from '@vinlook/ui/textarea';
import type { usePoiForm } from './usePoiForm';
type Props = Pick<ReturnType<typeof usePoiForm>, 'form' | 'set'>;
export function PoiContentFields({ form, set }: Props) {
  return (
    <>
      <div className="editor-section">
        <h3>
          02 <span>Giới thiệu & Thuyết minh</span>
        </h3>
        <label>
          Thông tin giới thiệu ngắn (Hiển thị cho du khách trên thẻ điểm đến)
          <Textarea
            maxLength={3000}
            rows={4}
            value={form.visitor_description}
            onChange={(event) => set('visitor_description', event.target.value)}
            placeholder="Giới thiệu tóm tắt điểm nổi bật, giờ mở cửa, lưu ý khi tham quan..."
          />
        </label>
        <p className="field-note text-[#a1a98f]">
          Nội dung này hiển thị trực tiếp trên thẻ POI của du khách, tách biệt với file audio.
        </p>

        <label>
          Kịch bản thuyết minh gốc (Dùng làm tư liệu dịch và tạo audio)
          <Textarea
            required
            maxLength={20000}
            rows={8}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="Viết câu chuyện lịch sử, kiến trúc, giá trị văn hóa để thuyết minh..."
          />
        </label>
        <p className="field-note text-[#a1a98f]">
          Thay đổi bài thuyết minh sẽ yêu cầu cập nhật lại bản dịch và giọng đọc.
        </p>
      </div>
    </>
  );
}
