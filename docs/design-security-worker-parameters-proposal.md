# Vinlook — D-007: tham số bảo mật và worker

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-057**. Tiếp nối DEC-053–056; chưa cài thư viện, tạo secret hoặc thay schema. Mọi con số mới bên dưới là đề xuất Vinlook cần duyệt, không phải quota hoặc cấu hình đã đo.

## A. Mật khẩu, phục hồi và JWT

- Mật khẩu tối thiểu **15 Unicode code points**, tối đa **72 byte UTF-8** theo bcrypt đã chọn. Cho phép khoảng trắng/Unicode và paste; không bắt buộc mẫu chữ hoa/số/ký tự đặc biệt; không trim hay tự đổi mật khẩu. Bcrypt cost 12 giữ theo DEC-054, phải đo trước triển khai.
- Mã phục hồi Staff sinh ngẫu nhiên mật mã **32 byte**, mã hóa base64url để trao qua kênh trực tiếp sau khi Manager xác minh; hết hạn **15 phút**, dùng một lần. Lưu **SHA-256 của mã ngẫu nhiên**, không lưu mã rõ; đây không phải cách băm mật khẩu. Cấp mã mới vô hiệu các mã cũ của Staff. Không thêm gửi mail/SMS tự động.
- Đổi/reset mật khẩu tăng `authVersion` của tài khoản. JWT chứa version tại lúc đăng nhập; Identity từ chối version cũ khi kiểm tra request. Đề xuất bổ sung trường này vào StaffAccount; không làm thay đổi phiên làm việc hằng ngày.
- JWT **HS256**, chỉ Identity giữ secret ngẫu nhiên tối thiểu 32 byte, xác minh cố định thuật toán, issuer, audience, expiration và authVersion. Service khác chuyển token tới Identity theo D-003, không nhận secret ký JWT. Token vẫn 2 giờ/in-memory/không refresh.
- Đổi secret JWT làm token cũ hết hiệu lực và yêu cầu đăng nhập lại; bản đầu không duy trì nhiều khóa JWT song song. Logout chỉ xóa token trong tab như D-006; reset/khóa mới ảnh hưởng quyền dùng token cũ theo cơ chế trên.
- Rate limit đề xuất tại Identity: login tối đa **5 lần thất bại/tài khoản/15 phút** và **30 request/IP/15 phút**; register **5 request/IP/giờ**; reset **5 lần thất bại/tài khoản/15 phút**. Không khóa vĩnh viễn vì sai mật khẩu; trả 429 và thời gian thử lại. IP ở đây chỉ phục vụ chống lạm dụng tạm thời, không dùng làm visitorId hoặc ghi vị trí.

Đề xuất collection bổ sung `AuthRateLimit`: key dạng HMAC của mục tiêu hạn chế (tài khoản/IP + loại thao tác), windowStart, count, expiresAt. Không lưu IP rõ; secret HMAC khác JWT. Expiry phải được kiểm tra bằng logic, không dựa vào việc dọn bản ghi đúng giây; dọn counters hết hạn được phép riêng vì không phải audit/POI/asset cần giữ. Bộ đếm chia sẻ qua Identity DB để không mất khi Render khởi động lại. Proxy/trust proxy cần cấu hình chính xác theo deployment; không tin tùy ý X-Forwarded-For.

## B. Credential service/worker và CORS

- Mỗi caller (POI service, Monitoring service, Python worker) có credential ngẫu nhiên riêng 32 byte, giữ ở biến môi trường hoặc secret deployment; không vào frontend/Git/log/image Docker. Bên nhận chỉ có quyền kiểm tra credential tương ứng, so sánh an toàn và ánh xạ caller → endpoint được phép.
- JWT nhân viên không thay credential nội bộ. Worker chỉ claim/renew/result job được phép; không publish, ghi audit Identity trực tiếp hoặc truy cập Atlas. Credential service không tự cấp quyền nhân viên thực hiện mutation.
- Luân chuyển credential bằng cửa sổ chấp nhận khóa cũ/mới tối đa **24 giờ**, sau đó bỏ khóa cũ; nếu nghi lộ thì thu hồi ngay, không chờ cửa sổ. Dev/Prod dùng secret khác nhau. Phân phối/khôi phục secret theo runbook chưa soạn, không dán vào tài liệu.
- CORS chỉ cho frontend Dev/Prod được liệt kê rõ, không wildcard cho API nhân viên; preview origin chỉ thêm khi được cấu hình. CORS không phải xác thực và không chặn client ngoài trình duyệt. API nội bộ vẫn bắt buộc credential qua HTTPS.
- Loại Authorization, password, recovery code, payload chứa credential và tọa độ query khỏi log; requestId phục vụ chẩn đoán, không ghi lịch sử di chuyển.

## C. Lease, retry và lưu khóa chống trùng

| Tham số | Đề xuất |
|---|---|
| Worker poll khi rảnh | 30 giây khi worker được chủ động bật cho phiên xử lý; không chạy poll vô hạn chỉ để giữ Render thức |
| Lease | 5 phút; gia hạn mỗi 60 giây bằng luồng không bị tác vụ MMS chặn; thời gian dựa trên server |
| Lease không gia hạn được | Không gửi kết quả như quyền còn hợp lệ; thử gia hạn/kiểm tra lại, server vẫn quyết định lease tại lúc nhận; kết quả stale bị từ chối |
| Nhận lại sau mất worker | Tối đa 3 lần nhận lại tự động/job; vượt mức chuyển failed để Staff xem và retry thủ công |
| Lỗi provider/quota | Không tự gọi lại vô hạn; failed/waiting_quota, Staff retry theo UC-014; phần đã tốt giữ nguyên |
| Outbox gửi lại | Lùi 5, 10, 20, 40, 60 giây rồi tối đa 60 giây/lần khi service đang thức, có jitter; pending giữ bền vững tới xác nhận, không tự bỏ sau một số lần |
| Idempotency-Key | Client tạo UUID cho một ý định thao tác; retry cùng ý định dùng lại khóa; không tạo khóa mới mỗi lần mạng lỗi |
| Thời gian giữ idempotency | 24 giờ từ lúc tiếp nhận; sau đó không bảo đảm phát lại cùng response, vẫn kiểm tra trạng thái/version nghiệp vụ để tránh thao tác sai |

Đề xuất collection `IdempotencyRecord` **trong POI DB**: actorId, operation, key, requestHash, status (in_progress/completed), responseStatus, responseBody tối thiểu, createdAt, expiresAt; unique(actorId, operation, key). Payload khác cùng khóa trả 409. Không lưu JWT hoặc dữ liệu mật khẩu trong responseBody.

Mutation đồng bộ ghi kết quả idempotency, nghiệp vụ và outbox trong cùng transaction khi phù hợp; pipeline trả job IDs sau khi trạng thái nhận việc được lưu bền vững. Không xóa record in_progress chỉ vì hết thời gian: phải xác định kết quả transaction trước khi cho chạy lại. Thiết kế request/response tiếp theo phải chỉ rõ từng thao tác và tình huống mất kết nối.

Các số lease/poll cần đo với thời gian MMS thực tế. Quá 5 phút xử lý vẫn được tiếp tục nếu lease được gia hạn đúng; không coi 5 phút là giới hạn độ dài tác vụ. Không khẳng định các tham số đáp ứng Day 5 hoặc ngân sách Render trước khi kiểm chứng topology.

## Căn cứ và phạm vi phê duyệt

[OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) làm căn cứ chọn độ dài tối thiểu khi không có MFA; [OWASP JWT](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html) làm căn cứ kiểm soát thuật toán và secret ngẫu nhiên. Các ngưỡng rate limit, phút, lần retry, thuật toán chọn cho dự án và collection mới là đề xuất riêng, chưa có phép đo.

Cần Duy duyệt hoặc sửa từng nhóm **A/B/C**, gồm trường/collection bổ sung. Phục hồi Manager, upload, hợp đồng API chi tiết, routing offline, hosting/quota và CI/CD vẫn còn mở; duyệt D-007 không hoàn tất toàn bộ Design.

## Kết quả phê duyệt

Duy duyệt toàn bộ nhóm A/B/C tại DEC-057, gồm authVersion, AuthRateLimit, IdempotencyRecord và các tham số đã trình. Phê duyệt cấu hình đề xuất không xác nhận benchmark hoặc triển khai đã thành công. Các phần ngoài D-007 vẫn còn mở.
