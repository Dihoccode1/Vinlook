# Vinlook — Đề xuất Design D-001: ranh giới service và tổ chức repository

Ngày: 23/10/2026. **PROPOSED — CHỜ DUY CHỌN PHƯƠNG ÁN**. Chưa phải kiến trúc đã duyệt; chưa tạo mã ứng dụng, workflow hoặc deployment.

**Cập nhật DEC-051:** Duy đã chọn **1B — ba service Express và worker Python**, **2A — monorepo**. Các phương án dưới đây được giữ làm lịch sử so sánh; không còn chờ chọn lại. Chỉ ranh giới trách nhiệm và cách tổ chức repo đã chốt, toàn bộ Design chưa được duyệt. Bước tiếp theo: [D-002 — dữ liệu và giao tiếp](design-data-communication-proposal.md).

Nguồn: [PRD](PRD.md), [User Stories](user-stories.md), [Use Cases](use-cases.md), [CR-001](changes/CR-001-backend-microservices-cicd.md), DEC-046/050 trong [Decision Log](decision-log.md). Use Case Diagram đã được điều chỉnh theo B: UC-013/014 độc lập. D-001 không thay đổi quan hệ nghiệp vụ này.

## Các ràng buộc đã chốt

- Backend theo hướng microservices, Express.js; giữ local Python worker cho Meta MMS Nigerian Pidgin. Có Docker/Compose và GitHub Actions; CD tự động sau checks/gate đã duyệt.
- Day 5 (26/10/2026) đã cần đủ 15 POI, 16 ngôn ngữ, tích hợp thật, microservices và CI/CD. Không tự lùi sang Day 35 hoặc thay bằng stub.
- Miễn phí hoàn toàn, Vercel frontend/Render backend, Atlas Free/Cloudinary Free. Không tự thêm dịch vụ có phí, Kubernetes, gateway, message broker hoặc cluster.
- Offline du khách vẫn phải mở lại, nghe, tìm và tính/tính lại đường được khi mất Internet. Việc tách backend không thay thế engine/dữ liệu tính đường trên thiết bị.
- Mọi phương án phải chứng minh service chạy/phát hành riêng theo AC-031/032; nhiều folder trong một process không đáp ứng yêu cầu đó.

## 1. Ranh giới backend — hai lựa chọn

### A. Hai service Express và worker Python — khuyến nghị để hạn chế đầu việc tích hợp

| Khối đề xuất | Trách nhiệm nghiệp vụ dự kiến | Nguồn |
|---|---|---|
| Platform Service — Express | Tài khoản/quyền, phiên và nhật ký, dữ liệu POI/bản nháp/bản công khai, quyền công khai/xóa/khôi phục, số liệu hiện diện và giao diện đọc Monitoring qua API. | UC-001–012, UC-015–032 theo phạm vi backend; các UC du khách còn thực hiện offline theo thiết kế riêng |
| Content Processing Service — Express | Tiếp nhận yêu cầu xử lý nội dung có quyền, điều phối dịch/TTS, theo dõi công việc/kết quả, thử lại phần lỗi và trạng thái quota/worker. Không tự công khai POI. | UC-013/014/032; REQ-011–013, REQ-024 |
| MMS worker — Python local | Tổng hợp Nigerian Pidgin theo lựa chọn đã duyệt; khi máy tắt thì công việc tương ứng chờ. | REQ-013, REQ-029; DEC-026/031 |

**Số đơn vị chạy dự kiến:** 2 ứng dụng Express + 1 worker Python, không tính frontend/database/media. Worker là khối xử lý riêng đã chọn, không được gọi là một service Express thứ ba hoặc giả định chạy trên Render. Cách worker kết nối Content Processing chưa chọn.

**Ưu:** Ít ranh giới giao tiếp hơn phương án B, giữ cổng quyền/phiên/POI/công khai trong cùng khối Platform; tập trung việc tách một năng lực xử lý nội dung có vòng đời riêng. Có thể trình bằng chứng phát hành độc lập hai service nếu thiết kế/triển khai đạt.

**Nhược:** Platform vẫn rộng, gộp nhiều năng lực; lỗi hoặc phát hành Platform ảnh hưởng nhiều chức năng. Không tách riêng identity và usage monitoring. Cần hợp đồng rõ để pipeline không tự ghi/công khai dữ liệu do Platform quản lý; không coi hai service dùng chung schema tùy ý là đã đạt tính độc lập.

### B. Ba service Express và worker Python

| Khối đề xuất | Trách nhiệm nghiệp vụ dự kiến | Nguồn |
|---|---|---|
| Identity & Staff Service — Express | Tài khoản/RBAC, trạng thái Staff, phục hồi, phiên làm việc và nhật ký thao tác của nhân viên. | UC-019–029 và quyền/phiên của UC-012–018 |
| POI & Content Service — Express | POI, nháp/công khai/xóa/khôi phục, điều phối dịch/audio và thử lại; vẫn kiểm tra điều kiện quyền/phiên trước mutation hoặc công khai. | UC-001–018 theo phạm vi backend, UC-032 về trạng thái công việc |
| Usage Monitoring Service — Express | Hiện diện trình duyệt, vòng đời người nghe, số liệu và hiển thị tình trạng phụ thuộc. | UC-030–032 |
| MMS worker — Python local | Xử lý Nigerian Pidgin và trạng thái khả dụng như lựa chọn đã duyệt. | REQ-013, REQ-029 |

**Số đơn vị chạy dự kiến:** 3 ứng dụng Express + 1 worker Python. Các tên trên là tên đề xuất, không phải repository hoặc service thật.

**Ưu:** Tách trách nhiệm tài khoản/nhân viên, POI/nội dung và usage rõ hơn; có thể phát hành và theo dõi từng miền riêng.

**Nhược:** Tăng giao tiếp để kiểm tra quyền/phiên/thu hồi quyền và ghi nhật ký xuyên service; cần xử lý nhất quán giữa POI và nhân viên. Thêm đơn vị deploy, cấu hình/secrets, kiểm thử tích hợp và rủi ro độ trễ/đánh thức service. Không tự thêm event bus để giải quyết các ranh giới này.

### Phần chưa quyết định khi chọn A hoặc B

Chọn phương án chỉ xác nhận **trách nhiệm/range service dự kiến**. Data ownership chi tiết, cách truyền yêu cầu/kết quả xử lý, API contract, cơ chế xác minh quyền/phiên/khóa ngay, polling/event, gateway, schema/collection/database và chính sách lỗi sẽ trình tiếp. Không chọn thay bằng một mẫu kiến trúc Microsoft hoặc thêm pattern mặc định.

Không ánh xạ một FEAT hoặc một Use Case Diagram thành một service. Sơ đồ nghiệp vụ chỉ cung cấp căn cứ xác định trách nhiệm. Các tham chiếu UC chỉ nói phần backend liên quan, không chuyển chức năng offline sang API bắt buộc online.

## 2. Tổ chức mã nguồn — lựa chọn độc lập với số service

### A. Monorepo trong Dihoccode1/Vinlook — khuyến nghị

Frontend, các service Express và worker có phạm vi mã nguồn tách biệt trong repository hiện tại; mỗi đơn vị có cấu hình build/test/deploy tương ứng theo Design sẽ duyệt. Một repo không có nghĩa một process, một image hay một deployment.

**Ưu:** Nhóm ba người giữ một đầu mối Issue/PR/tài liệu, dễ review thay đổi hợp đồng liên quan nhiều phần. **Nhược:** Cần cấu hình CI/CD đúng phạm vi thay đổi, tránh phát hành lại mọi service không cần thiết. Chưa chọn tên thư mục, package manager/workspace, branch strategy hoặc paths trigger.

### B. Nhiều repository

Mỗi phần có repository riêng; repository hiện tại giữ vai trò theo lựa chọn sẽ được duyệt nếu chọn B.

**Ưu:** Tách quyền/chu kỳ phát hành và CI từng phần rõ. **Nhược:** Tăng việc đồng bộ hợp đồng, cấu hình pipeline, liên kết Issue/PR và quản lý tài liệu cho nhóm ba người. Chưa tạo repository mới hoặc quyết định repo nào chứa phần nào.

## 3. Khả năng triển khai và rủi ro chung

Render Free cấp 750 giờ chạy dùng chung cho workspace/tháng, không phải mỗi service. Nhiều service cùng thức tiêu hao cộng dồn; services idle có thể ngủ và khi nhận yêu cầu cần đánh thức. Phải đo lại đường gọi giữa service và trải nghiệm cold start; không tự tăng giới hạn đã được chấp nhận. Nguồn: [Render Free](https://render.com/docs/free), đã kiểm tra trong CR-001 ngày 23/10/2026.

Ví dụ tính toán, **không phải chọn lịch vận hành**: trong 25 ngày tháng 11, hai service chạy liên tục cần 1.200 giờ; ba service cần 1.800 giờ, đều vượt 750 giờ. Chưa có yêu cầu service luôn thức 24/7 và chưa có bằng chứng cả hai phương án vừa quota. Không giải quyết bằng cách mở tài khoản né quota hoặc bật trả phí. Sau lựa chọn ranh giới, phải trình topology/điều kiện vận hành và bằng chứng phù hợp trước khi duyệt Design.

Microservices có chi phí phối hợp, data consistency, kiểm thử và vận hành; nguồn phân tích: [Microsoft — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices). Khuyến nghị A ở trên là đánh giá của tài liệu theo số ranh giới và ràng buộc dự án, không phải khẳng định Microsoft hoặc Render bảo đảm phương án đó đáp ứng Vinlook.

## 4. Điều kiện và bước tiếp theo

1. Duy chọn A/B cho ranh giới backend và A/B cho tổ chức repo. Chưa yêu cầu duyệt toàn bộ kiến trúc.
2. Dựa trên lựa chọn, trình data ownership, giao tiếp và topology miễn phí cùng các kiểm chứng cần thiết; chốt engine/package offline còn mở.
3. Tiếp tục ERD/data model, class/sequence theo quy trình và chỉ dùng kiến trúc đã duyệt. Các trường kỹ thuật và quan hệ quan trọng cần xác nhận riêng.
4. Sau phê duyệt Design mới chuyển triển khai theo Issue/AC đã chốt. Không tự giao người, khóa milestone chi tiết hoặc tạo workflow trong bước đề xuất này.

Rủi ro Day 5 vẫn còn và tăng theo độ phân rã. Không có ước lượng ngày công đáng tin cậy ở thời điểm này; việc chọn A không chứng minh hoàn thành đúng hạn.
