# Vinlook — Use Case Diagrams v1.0

Ngày: 23/10/2026. **ĐÃ ĐIỀU CHỈNH THEO LỰA CHỌN B — DEC-050**. Activity Diagrams đã duyệt tại DEC-049; UC-013 và UC-014 được giữ độc lập theo lựa chọn B.

[Xem toàn bộ sơ đồ](index.html) · [Manifest bao phủ UC](manifest.json) · [Use Case đã duyệt](../../use-cases.md) · [Giải thích quan hệ](relationships.md).

| Sơ đồ | Góc nhìn | Số UC | Mã nguồn | Hình |
|---|---|---:|---|---|
| UCD-001 | Du khách và offline | 11 | [PlantUML](UCD-001.puml) | [SVG](UCD-001.svg) / [PNG](UCD-001.png) |
| UCD-002 | Nội dung và vòng đời POI | 7 | [PlantUML](UCD-002.puml) | [SVG](UCD-002.svg) / [PNG](UCD-002.png) |
| UCD-003 | Tài khoản và phiên làm việc | 9 | [PlantUML](UCD-003.puml) | [SVG](UCD-003.svg) / [PNG](UCD-003.png) |
| UCD-004 | Monitoring | 3 | [PlantUML](UCD-004.puml) | [SVG](UCD-004.svg) / [PNG](UCD-004.png) |
| UCD-005 | Setup, CI/CD và nghiệm thu | 7 | [PlantUML](UCD-005.puml) | [SVG](UCD-005.svg) / [PNG](UCD-005.png) |

Tổng 37 UC, mỗi UC xuất hiện trong đúng một góc nhìn chính. Các view sản phẩm dùng cùng phạm vi hệ thống Vinlook; không coi mỗi view là một microservice. View vận hành có ngữ cảnh riêng, không thêm màn hình sản phẩm, tài khoản RBAC hoặc yêu cầu frontend.

Mọi UC truy ngược về US/REQ/AC qua tài liệu Use Case đã duyệt. Quyền Staff/Manager vẫn theo PRD; không suy ra kế thừa vai trò từ vị trí actor. Gói offline và microservices/CI-CD giữ nguyên yêu cầu đã chốt.

## Kiểm tra đã thực hiện

- 5 nguồn PlantUML và 5 SVG/PNG render thành công, mã kết thúc 0.
- Manifest bao phủ UC-001–UC-037 không thiếu/trùng. Không còn quan hệ include/extend hoặc actor generalization.
- Xem mẫu nội dung và vận hành để kiểm tra nhãn, actor, ranh giới và khả năng đọc.
- Công cụ PlantUML/Java portable dùng lại từ Activity Diagrams; render tại máy, không gửi nội dung dự án lên dịch vụ render. Smetana dùng cho bố cục.
- Đây là kiểm tra tài liệu, không phải kiểm thử ứng dụng hoặc bằng chứng đã triển khai CI/CD.

## Gate kế tiếp

Lựa chọn B và các điều chỉnh được ghi tại [relationships.md](relationships.md). Bước tiếp theo là trình phương án Design theo quy trình; chưa tự chọn kiến trúc/service/schema/API. Sequence Diagram sẽ dựa trên kiến trúc được duyệt ở bước phù hợp, không tự áp đặt Controller/Service/Repository.
