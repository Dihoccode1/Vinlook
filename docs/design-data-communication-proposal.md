# Vinlook — D-002: dữ liệu và giao tiếp giữa service

Ngày: 23/10/2026. **ĐỀ XUẤT CHỜ DUY DUYỆT**.

**Kết quả DEC-052:** Duy đã duyệt cả D-002.1, D-002.2 và D-002.3. Các phần dưới đây giữ nội dung đề xuất đã được duyệt; những mục ghi “chưa chọn” và điều kiện kiểm chứng vẫn còn mở. Không cần chọn lại topology dữ liệu, REST/HTTPS hoặc worker pull đã xác nhận. Chưa có triển khai thực tế.

Nguồn: [D-001](design-options.md), DEC-051 trong [Decision Log](decision-log.md); [PRD](PRD.md), [Use Cases](use-cases.md). Duy đã chọn ba service Express, local MMS worker và monorepo. D-002 không lựa chọn lại các phần đó; chưa có schema/API hoặc code ứng dụng.

## 1. Trách nhiệm dữ liệu theo ranh giới đã chọn

| Service | Dữ liệu nghiệp vụ thuộc trách nhiệm đã chọn | Luồng nguồn |
|---|---|---|
| Identity & Staff | Tài khoản, trạng thái Staff, quyền/khôi phục, phiên làm việc, lịch sử thao tác nhân viên. | UC-019–029; điều kiện quyền/phiên/nhật ký ở UC-012–018 |
| POI & Content | POI/tọa độ/thumbnail, nháp/công khai/xóa logic, text/audio theo ngôn ngữ, công việc và kết quả dịch/TTS, thử lại phần lỗi. | UC-001–018 theo phần backend, UC-032 về trạng thái công việc |
| Usage Monitoring | Hiện diện trình duyệt/thiết bị, phiên nghe và số liệu hiện tại; tổng hợp trạng thái phụ thuộc để hiển thị. | UC-030–032 |
| MMS worker local | Thực hiện tổng hợp Nigerian Pidgin theo công việc POI & Content cung cấp; không tạo nguồn dữ liệu nghiệp vụ hoặc quyền công khai riêng. | REQ-013/029, DEC-026/031 |

Đây là phân công trách nhiệm nghiệp vụ, chưa phải entity/field/relationship. Việc tổng hợp Monitoring không chuyển quyền sở hữu tài khoản hoặc công việc sang Usage Monitoring. Cách lưu trạng thái sức khỏe, lưu presence và thời hạn dữ liệu sẽ được cụ thể hóa, không tự thêm lịch sử hành trình du khách hoặc báo cáo lịch sử chưa được yêu cầu.

## 2. Ba đề xuất cụ thể cần duyệt

### D-002.1 — Một Atlas Free cluster, ba database logic cho Production

**Đề xuất:** Trong Production, dùng một cluster Atlas Free đã chọn và tách ba database logic theo ba service Express. Mỗi service sử dụng tài khoản DB giới hạn vào dữ liệu của mình; các service không đọc/ghi trực tiếp database của nhau. Khi cần dữ liệu hoặc thực hiện tác vụ thuộc service khác, dùng API đã được duyệt.

**Lợi ích:** Tách quyền và trách nhiệm dữ liệu, giữ một nguồn hạ tầng Atlas Free, không cần chọn thêm loại database. **Đánh đổi:** Vẫn chia sẻ CPU/storage/connection quota và điểm lỗi ở mức cluster; ba database không phải ba hạ tầng độc lập hoặc ba lần dung lượng miễn phí. Cần cấu hình đúng quyền của database users.

**Chưa chọn:** Tên database/collection, trường kỹ thuật, schema, indexes, cách tách dữ liệu Development khỏi Production và số connection pool. Tách môi trường là yêu cầu có sẵn; không cho Development dùng tùy tiện dữ liệu Production. Những chi tiết này sẽ trình ở data model/deployment.

**Căn cứ nền tảng:** Atlas có giới hạn Free cluster và cấu hình quyền database user; dùng quyền theo tài nguyên cần kiểm chứng trên tài khoản thực tế. Nguồn chính thức đã kiểm tra 23/10/2026: [Free cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/), [Database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/). Tài liệu nguồn không có nghĩa cluster/account hiện tại của nhóm đã được tạo hoặc kiểm tra quota. Chính sách sao lưu thủ công đã duyệt vẫn giữ nguyên.

### D-002.2 — REST qua HTTPS giữa các service

**Đề xuất:** Dùng REST/HTTPS cho giao tiếp giữa ba service và truy cập chức năng do service khác chịu trách nhiệm; chưa bổ sung message broker, Redis, Kafka/RabbitMQ, gateway hoặc Kubernetes. Các thao tác dài hạn trả/truy vấn trạng thái công việc theo hợp đồng sẽ được duyệt, không giữ một request mở chờ toàn bộ dịch/audio.

**Lợi ích:** Ít thành phần vận hành hơn so với thêm broker và có thể dùng trực tiếp stack Express đã chọn. **Đánh đổi:** Tăng phụ thuộc mạng/khả dụng và cần thiết kế kiểm soát lỗi giữa các service. Không có private-network traffic được bảo đảm trên Render Free; phải kiểm tra nơi triển khai và bảo vệ API gọi giữa service. Nguồn: [Render Free](https://render.com/docs/free), theo CR-001.

**Chưa chọn:** Endpoint, payload, cách gọi từ frontend, quyền service-to-service, cơ chế xác thực/JWT/thu hồi quyền, timeout/retry/idempotency, versioning hoặc cache. Đặc biệt khóa Staff phải có hiệu lực cả phiên hiện tại; không dùng phương án cache quyền làm sai yêu cầu này mà chưa trình Duy.

REST là lựa chọn giao tiếp đề xuất, không chứng minh mọi thao tác phải hoàn tất đồng bộ hoặc giao dịch xuyên service đã nguyên tử. Việc ghi nhật ký và kết quả thay đổi POI qua ranh giới Identity/POI phải có phương án nhất quán riêng được duyệt trước triển khai.

### D-002.3 — Worker Python chủ động lấy việc từ POI & Content qua API

**Đề xuất:** Công việc/trạng thái xử lý thuộc POI & Content. Khi máy nhóm bật và worker khả dụng, worker chủ động gọi API lấy công việc Nigerian Pidgin và gửi kết quả/trạng thái lại. Worker không kết nối trực tiếp Atlas database và không tự công khai POI; chưa yêu cầu mở cổng inbound hoặc tunnel vào máy nhóm.

**Lợi ích:** Khớp điều kiện worker local có thể tắt, xử lý chờ khi máy không hoạt động; không cần chọn thêm nền tảng queue có phí. **Đánh đổi:** Phải chốt giao nhận công việc để không nhận trùng/mất việc và bảo vệ API/credential của worker. Gọi lấy việc theo nhịp có thể ảnh hưởng giờ chạy và quota của backend, cần đo trước khi chốt nhịp.

**Chưa chọn:** Chu kỳ polling, nhận/giữ job, cách khôi phục job đang chạy khi worker tắt, xác thực worker, nơi upload tệp/kích thước/định dạng và cách CD cho worker trên máy nhóm. Không coi worker là Staff/Manager mới hoặc tự đặt thêm tài khoản RBAC. CI/CD cho ba service Express vẫn phải có ngay Day 5; phạm vi worker CI/CD phải cụ thể hóa trong release design, không ngầm coi thao tác deploy tay là đáp ứng CD tự động đã yêu cầu.

## 3. Tình huống phải chứng minh trong các bước Design sau

Các mục dưới đây là bài toán phát sinh từ yêu cầu đã duyệt, không phải lựa chọn giải pháp tự động có hiệu lực khi duyệt ba đề xuất:

| Tình huống | Bất biến phải giữ | Còn cần quyết định |
|---|---|---|
| Staff đang đăng nhập bị khóa, hoặc phiên làm việc đã đóng | Không được tiếp tục thao tác trái quyền/điều kiện. | Kiểm tra trạng thái và thu hồi quyền qua ranh giới service. |
| Thay đổi POI đã thực hiện nhưng ghi nhật ký ở Identity gặp lỗi | Lịch sử và kết quả thao tác phải được ghi đúng phiên. | Cách bảo toàn/hoàn tất ghi nhật ký khi có lỗi giữa service; không tuyên bố REST tự giải quyết tính nhất quán. |
| Bản sửa POI đang dịch/audio | Bản công khai cũ còn phục vụ, bản mới chỉ công khai khi đủ 16 ngôn ngữ được duyệt. | Lưu phiên bản và gắn kết quả job với bản nội dung chính xác. |
| Worker tắt/hết quota/lỗi ngôn ngữ | Giữ phần tốt, chờ hoặc thử lại khi có điều kiện, không tự công khai/trả phí. | Giao nhận/thu hồi việc, trạng thái và bảo vệ credential. |
| Một hoặc nhiều service đang ngủ | Không tự tăng ngưỡng hiệu năng/cold start hoặc làm chức năng offline cần mạng. | Đo chuỗi đánh thức, network latency và quota giờ dùng chung. |
| Kiểm tra CI không đạt | Không deploy revision đó như bản đạt; khi đủ checks/gate thì CD tự động. | Triggers, checks, artifact, release gate và rollback. |

## 4. Điều kiện xét duyệt

Duy có thể duyệt cả ba đề xuất hoặc sửa từng mục D-002.1/2/3. Phê duyệt không đồng nghĩa duyệt schema, API contract, tham số vận hành hoặc Design toàn bộ. Sau đó sẽ trình phương án bảo mật/nhất quán, data model và các kiểm chứng kỹ thuật, bao gồm offline routing còn mở, theo thứ tự phù hợp đã thống nhất.

Không tạo cluster/database/users, gọi API nhà cung cấp có phí, triển khai service, tạo workflow/GitHub Issue hoặc phân công thành viên trong bước này. Mọi số đo quota/khả năng thực tế vẫn cần bằng chứng; rủi ro Day 5 chưa được giải quyết chỉ bằng tài liệu.
