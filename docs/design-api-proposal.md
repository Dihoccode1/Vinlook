# Vinlook — D-006: khung API và quy tắc nhất quán

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-056**. Cơ sở D-001–005, DEC-051–055; không phải OpenAPI hoàn chỉnh hoặc endpoint đã triển khai. Các đường dẫn dưới đây tương đối với từng service, không ngầm thêm gateway.

## 1. Quy ước đề xuất

- Prefix `/api/v1`; JSON cho request/response nghiệp vụ; lỗi dạng `{error: {code, message, requestId}}`, không lộ stack trace/credential. Asset audio/ảnh tải từ URL phân phối, không nhét binary vào JSON.
- 200 đọc/cập nhật, 201 tạo, 202 nhận xử lý bất đồng bộ; 400 request sai định dạng, 401 thiếu/hết hạn token, 403 không đủ quyền/tài khoản bị khóa, 404 không có tài nguyên được phép thấy, 409 xung đột phiên bản/trạng thái, 422 vi phạm dữ liệu, 429 vượt giới hạn, 503 dependency không khả dụng. Có mã lỗi nghiệp vụ riêng để giao diện hiển thị tiếng Anh.
- API nhân viên dùng Bearer JWT; xác minh quyền hiện tại qua Identity theo D-003. API thay đổi nội dung/duyệt/job cần phiên làm việc đang mở. Endpoint service/worker không dùng JWT du khách hoặc mở công khai; credential và thuật toán được trình riêng.
- Danh sách quản trị phân trang theo cursor, đề xuất mặc định 20, tối đa 100 bản ghi/lần. Không áp giới hạn này vào gói offline; gói cần manifest đầy đủ.
- Không tin actorId/role/workSessionId do client tự khai: server lấy từ ngữ cảnh đã xác minh. Giờ và ngày phiên dựa trên server; kiểm tra đóng phiên qua ngày ở API ngay cả khi scheduler chưa chạy.

## 2. Identity & Staff

| Endpoint đề xuất | Quyền và hành vi |
|---|---|
| POST /auth/register | Công khai; fullName/email/password/confirmPassword; tạo pending, không tự đăng nhập với quyền Staff |
| POST /auth/login | Email/password; chỉ tài khoản active; trả access token 2 giờ trong bộ nhớ tab |
| GET /me | Nhân viên active; thông tin/quyền hiện tại |
| GET /staff; POST /staff/:id/approve | Manager; danh sách và duyệt Staff pending |
| POST /staff/:id/lock; POST /staff/:id/unlock | Manager; giữ lịch sử tài khoản |
| POST /work-sessions/open | Staff/Manager; tạo hoặc mở lại đúng phiên ngày VN, không tạo trùng |
| POST /work-sessions/:id/close | Đóng phiên của chính mình; ghi lý do/thời điểm |
| GET /work-sessions; GET /audit-logs | Staff chỉ dữ liệu mình, Manager toàn bộ; lọc ngày/nhân viên/POI theo quyền |
| POST /staff/:id/recovery-codes | Manager đã xác minh người yêu cầu; cấp mã một lần, không tự gửi email |
| POST /auth/reset-password | Mã hợp lệ chưa dùng + password/confirmPassword; tiêu thụ mã và đổi hash nguyên tử |
| POST /internal/authorize | Chỉ service; trả trạng thái/quyền/phiên hiện tại của principal được xác minh |
| POST /internal/audit-events | Chỉ POI service; tiếp nhận chống trùng eventId; xác nhận cả khi sự kiện đã được ghi trước đó |

Setup Manager và phục hồi Manager là runbook vận hành, chưa thêm endpoint công khai. Logout bản đầu xóa JWT trong bộ nhớ tab; không tuyên bố thu hồi token bị sao chép chỉ bằng logout. Khóa tài khoản vẫn có hiệu lực qua kiểm tra quyền hiện tại. Chính sách thay mật khẩu ảnh hưởng token cũ phải chốt trong thiết kế bảo mật tiếp theo.

## 3. POI & Content

| Endpoint đề xuất | Quyền và hành vi |
|---|---|
| GET /pois; GET /pois/:id | Công khai; chỉ bản published của POI chưa xóa; chọn ngôn ngữ qua query; không lộ draft |
| GET /pois/nearby | Công khai; tọa độ tạm trong request, bán kính 3 km, tối đa 4 kết quả theo khoảng cách thẳng; không lưu vị trí vào DB/log ứng dụng |
| GET /offline/manifest | Công khai; version và tham chiếu thành phần gói English; checksum/dung lượng/hosting thiết kế riêng |
| GET /admin/pois; GET /admin/pois/:id | Nhân viên; xem draft/published/deleted theo nghiệp vụ |
| POST /admin/pois | Nhân viên + phiên mở; tạo POI và revision draft |
| POST /admin/pois/:id/draft | Tạo bản nháp từ bản published; 409 nếu đã có draft/in_review |
| PATCH /admin/revisions/:id | Sửa draft với expectedEditVersion; sai phiên bản trả 409; không sửa published |
| POST /admin/revisions/:id/process | Nhân viên kích hoạt pipeline; trả 202 và job IDs, không chờ audio hoàn tất |
| GET /admin/jobs; GET /admin/jobs/:id | Nhân viên; trạng thái và lỗi đã lọc thông tin nhạy cảm |
| POST /admin/jobs/:id/retry | Nhân viên + phiên mở; chỉ failed/waiting_quota đủ điều kiện; giữ phần đã thành công |
| POST /admin/revisions/:id/languages/:code/review | Nhân viên + phiên mở; approved/changes_required cho đúng bản nội dung đang xem |
| POST /admin/revisions/:id/submit | Gửi Manager duyệt; kiểm tra revision hiện tại và điều kiện gửi |
| POST /admin/revisions/:id/return | Manager + phiên mở; trả bản in_review về draft và lý do |
| POST /admin/revisions/:id/publish | Manager + phiên mở; kiểm tra lại đủ 16 text/audio được duyệt, thời lượng hợp lệ; đổi con trỏ công khai và ghi outbox cùng transaction |
| POST /admin/pois/:id/delete; POST /admin/pois/:id/restore | Manager + phiên mở; soft delete/restore thành nháp, không tự công khai |
| POST /internal/jobs/claim | Worker được xác thực; nhận độc quyền job phù hợp hoặc trả không có việc |
| POST /internal/jobs/:id/renew; POST /internal/jobs/:id/result | Worker; kiểm tra attemptId/lease/inputVersion; stale attempt trả 409, không ghi đè |

Route `/pois/nearby` phải được phân biệt với `:id`. Search dùng tham số `q` của GET /pois; không tự chọn engine tìm kiếm hoặc route walking provider. Routing đi bộ online/offline cần quyết định engine trước khi có contract cụ thể; PMTiles không đảm nhiệm tính tuyến.

## 4. Usage Monitoring

| Endpoint đề xuất | Quyền và hành vi |
|---|---|
| POST /presence/heartbeat | Du khách không login; browserId; server cập nhật lastSeenAt |
| POST /listening/start | browserId/playbackId/poiId/languageCode; bắt đầu khi Play, không tính là xác nhận đã nghe hết |
| POST /listening/:playbackId/heartbeat | Duy trì lượt phát kể cả pause; không tạo mới vì heartbeat gửi lặp |
| POST /listening/:playbackId/end | Kết thúc do completed/page_closed; gọi lặp không kết thúc lại lượt khác |
| GET /monitoring/summary | Nhân viên active; số browser online/người nghe hiện tại, thời điểm dữ liệu; dashboard cập nhật 30 giây |
| GET /monitoring/health; GET /monitoring/jobs | Nhân viên active; tổng hợp qua API/health của service, không truy cập DB khác |

Đề xuất heartbeat du khách/lượt nghe **30 giây**, loại khỏi số hiện tại nếu quá **90 giây**; không cố giữ Render thức khi không có người dùng. Đóng tab chỉ gửi kết thúc theo khả năng trình duyệt; mất tín hiệu dùng timeout, không cam kết server nhận ngay. Một browser phát nhiều tab vẫn đếm một người nghe. Presence không phải xác thực danh tính thật; dữ liệu client có thể bị giả, biện pháp chống lạm dụng chờ thiết kế bảo mật.

## 5. Quy tắc giao dịch và xung đột

1. Sửa/duyệt/submit/publish phải gắn expectedEditVersion; 409 khi bản đã đổi, giao diện yêu cầu tải lại trước khi gửi tiếp. Không tự gộp nội dung hoặc ghi đè.
2. Thay đổi ảnh hưởng text/audio làm mất hiệu lực duyệt của phần bị ảnh hưởng; sửa source English làm cũ kết quả dịch/audio phụ thuộc. Trước publish server kiểm tra phiên bản đầu vào, không chỉ kiểm tra đủ số dòng.
3. Đề xuất khóa sửa bản in_review; Manager trả về draft trước khi sửa. Muốn duyệt chính bản sửa của mình vẫn theo các bước này.
4. Trong một transaction của POI DB: thay đổi nội dung/trạng thái + outbox. Bên nhận nhật ký chống trùng eventId. Identity tạm lỗi sau commit không khiến client hiểu là POI chưa lưu; response báo audit pending khi có thể xác định.
5. Đề xuất Idempotency-Key cho tạo POI, kích hoạt pipeline, retry, publish, delete/restore: cùng người gọi + khóa + nội dung request trả lại kết quả đã nhận; cùng khóa nhưng payload khác trả 409. Nơi lưu và thời hạn khóa sẽ trình cùng schema bổ sung, chưa tự thêm collection.
6. Khóa tài khoản ngăn request chưa qua kiểm tra quyền. Request đã qua kiểm tra và đang commit có thể hoàn tất; không hứa hủy ngược giao dịch đang chạy. Đây là điểm biên cần Duy chấp nhận, chưa nằm trong các phê duyệt trước.

## 6. Phạm vi đã duyệt tại DEC-056

- **A:** Khung endpoint/quyền, quy ước lỗi, phân trang 20/100, heartbeat 30 giây và nguyên tắc xung đột ở trên, để tiếp tục viết request/response chi tiết.
- **B:** Khóa chỉnh sửa khi in_review, và chấp nhận request đã qua kiểm tra quyền có thể hoàn tất khi tài khoản vừa bị khóa.
- **C:** Dùng Idempotency-Key cho các thao tác liệt kê; thiết kế lưu/thời hạn sẽ trình riêng, chưa coi là schema đã duyệt.

Chưa chọn JWT algorithm/service credentials, lease/poll/retry, password minimum/recovery expiry, API routing walking, upload/download package hoặc CI/CD/deployment. Không có endpoint/workflow được triển khai. D-006 chưa thay thế OpenAPI đầy đủ hay gate Design tổng thể.

