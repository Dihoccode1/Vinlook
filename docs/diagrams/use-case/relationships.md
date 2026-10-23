# Vinlook — Giải thích quan hệ trong Use Case Diagram

**Trạng thái: ĐÃ XÁC NHẬN LỰA CHỌN B — DEC-050**, 23/10/2026. Nguồn nghiệp vụ: UC-001–037, User Stories và PRD đã duyệt; DEC-049 cho phép soạn đề xuất này.

## 1. Association giữa actor và Use Case

Nét liền thể hiện actor tham gia mục tiêu UC; không chỉ thứ tự thời gian hoặc gọi API. Các actor và quyền theo bảng ánh xạ đã duyệt:

- Du khách: UC-001–011, không yêu cầu đăng nhập.
- Staff: UC-012/013/014/015/020/024/025/026/028/030/031/032.
- Manager: UC-012/013/014/015/016/017/018/020/021/023/024/025/026/027/030/031/032.
- Người đăng ký Staff: UC-019, chưa có quyền Staff.
- Người vận hành: UC-022/029/033/034. Chưa giao trách nhiệm cho thành viên cụ thể, không thêm role RBAC.
- Nhà phát triển/người tạo revision: UC-035; GitHub Actions là bên tự động hóa hỗ trợ UC-035/036 trong ngữ cảnh vận hành, không là tài khoản người dùng ứng dụng.
- Duy: UC-037, xét bằng chứng nghiệm thu; không tự suy ra Duy có tài khoản Manager.

Các quyền Manager/Staff trùng nhau được vẽ trực tiếp, **không đề xuất actor generalization** hoặc thay đổi cách lưu RBAC. Staff xem lịch sử của mình còn Manager xem tất cả, dù cùng tham gia UC-026.

## 2. Quyết định: UC-013 và UC-014 độc lập, không extend

Duy chọn **B** tại DEC-050. Đã bỏ mũi tên `UC-014 → UC-013` và xóa điểm mở rộng đề xuất khỏi hình UCD-002.

- UC-013 chủ động chạy dịch/audio và có thể kết thúc ở trạng thái thành công hoặc chưa hoàn tất.
- UC-014 được nhân viên khởi phát độc lập khi đã có công việc lỗi/chờ, có quyền/phiên làm việc mở và dịch vụ/worker/quota đáp ứng điều kiện thử lại. Có thể quay lại ở thời điểm khác, không giữ request hoặc phiên cũ mở đến lúc thử lại.
- Vẫn giữ phần thành công, chỉ xử lý phần cần thử lại; không vượt cổng công khai đủ 16 ngôn ngữ và không tự bật trả phí.
- Association của Staff/Manager với cả hai UC giữ nguyên. Không thay API/queue/schema hoặc chọn cách retry kỹ thuật.

Nguồn: US-011/013, REQ-011/013/028, AC tương ứng và UC-013/014. Quan hệ thời gian/công việc đầu vào được ghi bằng precondition, không dùng `include` hoặc `extend` cho cặp này.

## 3. Chưa đề xuất include trong bộ này

`include` thể hiện chèn hành vi của một UC khác vào UC đang xét; không dùng chỉ vì một điều kiện đã được đáp ứng trước đó. Với các UC hiện có, chưa có nhu cầu trích hành vi dùng chung mới được xác nhận. Vì vậy không tạo UC kỹ thuật bổ sung chỉ để có mũi tên include.

| Cặp dễ bị hiểu thành include | Cách biểu diễn trong đề xuất |
|---|---|
| Thao tác nội dung → UC-020 đăng nhập | Tài khoản được xác thực là precondition; không buộc đăng nhập lại trong mỗi thao tác. |
| Thao tác nội dung → UC-024 mở phiên | Phiên mở là precondition; không tạo/mở lại phiên cho từng lần sửa hoặc duyệt. |
| UC-016 công khai → UC-015 kiểm tra/trình | Có nội dung được chuẩn bị/trình là điều kiện trước; việc của Staff/Manager có thể diễn ra ở thời điểm khác. |
| UC-028 đặt mật khẩu → UC-027 cấp mã | Mã đã được cấp/xác minh là điều kiện đầu vào; không bắt Manager cấp lại trong lần Staff nhập mã. |
| UC-036 triển khai → UC-035 CI | Artifact/revision đạt kiểm tra là điều kiện phát hành; không buộc chạy lại toàn bộ CI bên trong mỗi lần CD. |
| UC-008 dùng offline → mọi UC du khách | Offline là bối cảnh thực hiện nhiều chức năng; một lần mở app không bắt buộc tìm điểm, dẫn đường và nghe hết tất cả nội dung. |

Không đề xuất include không có nghĩa bỏ xác thực, kiểm tra quyền, phiên mở, cổng duyệt hay CI. Chúng vẫn là yêu cầu bắt buộc ở các luồng liên quan.

## 4. Ranh giới sơ đồ

UCD-001–004 là các góc nhìn của **cùng sản phẩm Vinlook**, không phải bốn service hoặc bốn app. UCD-005 là ngữ cảnh vận hành/setup/nghiệm thu đã được duyệt tách khỏi chức năng khách. Công cụ bên ngoài xuất hiện ở ngữ cảnh vận hành chỉ cho biết vai trò tham gia, không định nghĩa topology, secrets, trigger, protocol hoặc provider API.

Các bước theo thời gian, nhánh lỗi, tự đóng lúc 00:00, vòng đời presence và thu hồi quyền được thể hiện ở Use Case/Activity Diagram; không biến mỗi điều kiện hoặc lỗi thành ellipse mới.

## 5. Căn cứ ký pháp và giới hạn

Nguồn sơ đồ: [PlantUML Use Case Diagram](https://plantuml.com/use-case-diagram). Về UML: [IBM — Include relationships](https://www.ibm.com/docs/en/dma?topic=diagrams-include-relationships), [IBM — Extend relationships](https://www.ibm.com/docs/en/dma?topic=diagrams-extend-relationships). IBM phân biệt việc chèn hành vi UC khác với việc bổ sung hành vi có điều kiện, mũi tên extend hướng từ UC mở rộng đến UC gốc.

Các nguồn này giải thích ký pháp; lựa chọn quan hệ cụ thể của Vinlook là phân tích của tài liệu này và cần Duy duyệt. Không sử dụng sơ đồ tham khảo để thêm business rule hoặc tự lựa chọn dịch vụ.

## Kết quả xác nhận

Duy chọn B: giữ hai UC độc lập. Bộ hình đã cập nhật, không còn include/extend hoặc actor generalization. Các lựa chọn Design vẫn phải trình duyệt riêng; quyết định sơ đồ không chọn ranh giới microservice.
