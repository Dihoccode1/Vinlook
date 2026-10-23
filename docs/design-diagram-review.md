# Vinlook — D-016: sequence và class/responsibility views

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-076**. Dựa trên UC-001–037 và DEC-051–075. Duyệt D-015 không đồng nghĩa các sơ đồ mới đã được duyệt.

Mở [gallery](diagrams/design/index.html) để xem 9 sequence views và 4 class/responsibility views, kèm nguồn PlantUML, SVG và PNG. Nguồn sinh: diagrams/build_design_views.py. Dùng PlantUML theo lựa chọn định dạng đã chốt; Mermaid trong các tài liệu proposal trước được giữ như lịch sử, bộ sơ đồ này là bản PlantUML để review.

## Sequence views

| ID | Nội dung | Use Cases |
|---|---|---|
| SEQ-001 | Public map/search/nearby, ngôn ngữ và audio | 001–005, 010–011 |
| SEQ-002 | Routing foreground, GPS và stale result | 006 |
| SEQ-003 | Download/update/reopen offline và deletion sync | 007–009 |
| SEQ-004 | Accounts, xác thực, khóa và recovery | 019–023, 027–029 |
| SEQ-005 | Work sessions và giao audit bền vững | 024–026 |
| SEQ-006 | Draft/review/publish/delete/restore | 012, 015–018 |
| SEQ-007 | Process/retry, lease và media | 013–014 |
| SEQ-008 | Presence/listeners/health | 030–032 |
| SEQ-009 | Backup/restore trial, CI/CD/checkpoint | 033–037 |

Đây là **các view nhóm theo trách nhiệm**, không phải đề xuất tách/gộp lại Use Case. Tất cả 37 UC có liên kết tới view; không có nghĩa mọi alternative flow hoặc request/response chi tiết đã được mô hình hóa trong một sơ đồ tổng quan. Quy tắc chi tiết tiếp tục nằm ở UC và D-001–015. Manifest liên kết UC → US/REQ từ văn bản nguồn, không gán Issue/PR/test đã chạy khi chưa tồn tại.

## Class/responsibility views

| ID | Phạm vi | Ý nghĩa |
|---|---|---|
| CLS-001 | Identity & Staff | Thực thể tài khoản/phiên/audit/recovery và thao tác đã duyệt |
| CLS-002 | POI & Content | POI/revision/localized/jobs/outbox/idempotency, quan hệ trong DB service |
| CLS-003 | Usage Monitoring | Browser presence và từng lượt nghe |
| CLS-004 | Browser/offline/engine | Phân chia trách nhiệm UI, điều phối navigation, Worker và local package |

Các hộp thao tác là **module trách nhiệm khái niệm**, không buộc JavaScript dùng class, Controller/Repository pattern, DI framework hoặc inheritance. Thuộc tính chỉ hiển thị trường chính; danh mục trường và ràng buộc đầy đủ ở các proposal đã duyệt. Không bổ sung shared model/cross-DB join hoặc DB user dùng chung.

## Verification của tài liệu

- 13 nguồn được render SVG/PNG thành công bằng PlantUML portable đã dùng trong dự án; render.log lưu exit codes.
- Đã kiểm tra ánh xạ có đủ UC-001–037 trong sequence manifest, không thiếu ID.
- Đã xem ảnh mẫu routing và POI responsibility để kiểm tra bố cục. Không tuyên bố đã review trực quan từng pixel của mọi view hoặc đã chạy sản phẩm.
- Sequence không thay thế OpenAPI đầy đủ, Test Plan, Implementation task hoặc bằng chứng vận hành. SEQ-009 mô tả các nhánh công việc vận hành, không nói backup/CI/restore là một transaction tự động.

## Nội dung cần duyệt

Duyệt bộ **SEQ-001–009 và CLS-001–004** làm các view thiết kế nhóm theo trách nhiệm; hoặc chỉ rõ view cần chỉnh. Việc này không duyệt trước các library/config chưa trình, task/assignment, toàn bộ Design hay release.

Sau khi duyệt: hoàn thiện contract/schema chi tiết còn thiếu và Test Plan/traceability, rồi trình Design readiness để quyết định gate. Không bắt đầu code sản phẩm chỉ vì đã render sơ đồ.

Duy duyệt toàn bộ SEQ-001–009 và CLS-001–004 theo DEC-076. Phạm vi phê duyệt là các view thiết kế, không xác nhận ứng dụng đã được triển khai hoặc Design tổng thể hoàn tất.

