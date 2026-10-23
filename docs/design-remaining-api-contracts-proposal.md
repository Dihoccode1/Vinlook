# Vinlook — D-017: contract tài khoản, public data và monitoring

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-077**. Truy vết REQ-001–004/009/016–025, UC-001–005/009–011/019–028/030–032. Bổ sung D-006; không tạo endpoint, collection hoặc thư viện thực tế.

## 1. Quy ước payload và lỗi đề xuất

Request JSON từ chối trường không nằm trong allowlist của operation; không gán thẳng body vào Mongoose update. ID dạng chuỗi ObjectId khi tham chiếu dữ liệu server; thời điểm trả ISO-8601 UTC; vị trí GeoJSON Point longitude trước latitude. Reject NaN/Infinity, lat/lon ngoài phạm vi hoặc bán kính/limit trái rule; không silently mở rộng nearby.

Response thành công dạng `{data, requestId}`; danh sách `{data: {items, nextCursor}, requestId}`; lỗi giữ `{error: {code, message, requestId}}` theo D-006, bổ sung `details` chỉ cho lỗi validation an toàn. Không trả passwordHash, codeHash, credential, stack trace hoặc Mongo internals. 429 thêm Retry-After. Mã nghiệp vụ ổn định, message English cho nhân viên; du khách dịch label theo locale ở client.

## 2. Identity — request/response

| Operation | Request cho phép | data trả về / kiểm tra |
|---|---|---|
| Register | fullName, email, password, confirmPassword | accountId, status=pending; kiểm tra bcrypt policy D-007, không trả token |
| Login | email, password | accessToken, expiresIn=7200, account={id,fullName,email,role,status}; token chỉ giữ memory tab |
| Me | Không body | account và currentWorkSession hoặc null; account hiện tại từ DB |
| Approve/lock/unlock Staff | target ở path, expected status trong request | accountId/status; conflict nếu chuyển trạng thái không hợp lệ |
| Open session | Không nhận staffId/date từ client | session={id,workDateVN,status,openedAt,closedAt}; trả cùng id nếu đã mở ngày đó |
| Close session | session ở path | session đã đóng; chỉ phiên của chính người gọi; không tùy ý đóng phiên người khác |
| Issue recovery code | target ở path | code dùng một lần, expiresAt; chỉ Manager được cấp và xem một lần, không log/cache response |
| Reset password | email, code, password, confirmPassword | reset=true; consume code và tăng authVersion nguyên tử; không tự đăng nhập hoặc tạo session mới |
| Staff/session/audit list | cursor, limit, filter phù hợp | items/nextCursor; Staff chỉ phạm vi đã duyệt, không đổi scope từ query |

Đề xuất validation fullName từ 1–100 Unicode code points sau trim; email ≤254 ký tự, trim/lowercase theo D-005. Không tự thêm username/phone/birthday. Thông báo login/reset sai không phân biệt tài khoản không tồn tại với sai credential. Với email đăng ký trùng, đề xuất thông báo generic “Registration could not be completed” thay vì lộ trạng thái tài khoản. Không tự thêm xác minh email.

Đề xuất đăng ký public **chỉ Staff**, Manager do bootstrap/operator theo D-014; không cho truyền role trong body. Manager account API quản lý Staff, không cho Manager tự khóa chính mình hoặc khóa/nâng role Manager khác qua API Staff. Đây là chặn trường hợp tự khóa quản trị, không tự thêm vai trò Super Admin hoặc quy trình thay Manager.

## 3. Public POI và đồng bộ xóa

GET /pois nhận q, language và cursor/limit khi đọc danh sách; GET /pois/:id trả đúng published revision chưa xóa. Đề xuất payload:

```json
{
  "data": {
    "id": "poi-id",
    "revisionId": "published-revision-id",
    "nameEN": "Place name",
    "location": {"type":"Point","coordinates":[106.7,10.7]},
    "entrance": {"type":"Point","coordinates":[106.7,10.7]},
    "thumbnail": {"url":"approved-asset-url"},
    "languageCode": "en",
    "text": "Approved description",
    "audio": {"url":"approved-audio-url","durationSeconds":120}
  },
  "requestId": "request-id"
}
```

ID/URL/tọa độ trong ví dụ là placeholder, không phải dữ liệu POI đã kiểm chứng. nameEN là tên chuẩn trong dữ liệu; bản dịch description không tự đồng nghĩa có tên riêng đã dịch. Nếu cần tên dịch riêng phải đề xuất field riêng, không bịa trong response.

Nearby nhận lat/lon, cố định radius=3000 m/limit≤4, trả items kèm straightLineDistanceMeters và actualCount. Không dùng khoảng cách này làm walkingDistance. Search đề xuất đối chiếu tên English và tên địa phương đã nhập có kiểm soát; **chưa có field tên địa phương trong model**, nên ở baseline hiện tại chỉ nameEN, việc thêm alias cần quyết định riêng. Không hứa tìm tên tiếng Việt khi chưa có dữ liệu tương ứng.

Đề xuất endpoint bổ sung **GET /pois/deletions** để sync tombstone: trả IDs POI đang soft-deleted và server timestamp. Với quy mô prototype trả snapshot đầy đủ (có phân trang nếu cần), không dùng since-cursor/event log chưa có schema. Không lộ draft/actor xóa. Client chỉ áp dụng sau khi tải đủ snapshot thành công; lỗi không tự xóa hết cache. Nếu POI sau đó restore thành draft vẫn không trở lại public cho tới publish đúng gate.

Khi online không có locale được yêu cầu hoặc asset bất khả dụng, trả trạng thái rõ; không tự cho publish thiếu 16 ngôn ngữ. Offline English theo baseline, không coi missing online locale là tín hiệu tự tải gói.

## 4. Định danh browser và playback

Đề xuất browserId là UUID ngẫu nhiên, lưu **localStorage dành riêng định danh du khách**, dùng chung các tab cùng origin. JWT nhân viên vẫn tuyệt đối không lưu localStorage. Trình duyệt khác/profile khác/private mode hoặc xóa storage tạo định danh khác; không fingerprint/IP tracking hoặc hứa phân biệt thiết bị vật lý tuyệt đối.

Khởi tạo browserId theo cơ chế điều phối tab để tránh hai tab mở lần đầu ghi hai giá trị; đặc tả implementation phải có test race và fallback nếu browser coordination API không có. Khi storage bị từ chối, đề xuất session memory ID và báo số liệu chỉ best effort; không chặn chức năng du lịch vì telemetry.

playbackId UUID mới cho mỗi lượt Play từ trạng thái chưa phát/đã kết thúc. Pause/Resume giữ cùng lượt; kết thúc/Close/Play POI khác kết thúc lượt cũ, bấm Play lại tạo lượt mới. browserId dùng chung không có nghĩa các tab chia sẻ một audio; quy tắc một audio/tab của D-015 giữ nguyên.

## 5. Monitoring — payload và trạng thái

| Operation | Request | Phản hồi/điều kiện |
|---|---|---|
| presence heartbeat | browserId | acceptedAt server; không nhận current GPS/IP identity |
| listening start | browserId, playbackId, poiId, languageCode | playbackId/acceptedAt; không tăng lần nữa khi gửi lặp cùng identity và payload |
| listening heartbeat | browserId, playbackId | Chỉ cập nhật lượt còn mở; không mở lại lượt đã ended |
| listening end | browserId, playbackId, reason=completed/page_closed/closed/replaced | endedAt; lặp lại idempotent, không ảnh hưởng lượt khác |
| summary | Staff auth | asOf, onlineVisitors, currentListeners, refreshedAt; đếm distinct browser đang hợp lệ |
| health/jobs | Staff auth | component name, status, checkedAt, lastSuccessAt/errorCode an toàn; job counts theo state |

Đề xuất endReason bổ sung closed/replaced để phù hợp Close mini-player/Play POI khác đã duyệt; Pause không gửi end. Nếu end tới trước start vì mạng đảo thứ tự, đề xuất lưu bản ghi kết thúc tối thiểu theo playbackId và không cho start muộn hồi sinh lượt đó; request cần chứa identity và timestamps server. Schema ListeningSession phải cho phép tombstone trạng thái kết thúc chưa có startedAt; các trường start-only vẫn bắt buộc khi nhận start bình thường. Đây là điều chỉnh ràng buộc cần duyệt, không tự coi đã nằm trong schema cũ.

Không báo delayed end của lượt A làm kết thúc lượt B. Offline không xếp hàng heartbeat lịch sử rồi gửi lại như đang nghe tại thời điểm hiện tại. Có mạng lại chỉ báo presence/lượt còn thực sự active; không tạo lịch sử vị trí hoặc báo đủ lượt nghe offline chưa được yêu cầu.

## 6. Health freshness đề xuất

Chỉ kiểm tra dependency khi có dashboard/release đang hoạt động, không thêm daemon ping 24/7. Đề xuất mỗi lần dashboard refresh 30 giây dùng sample không quá 30 giây, timeout **3 giây mỗi dependency**, chạy kiểm tra độc lập song song. Timeout/cold start trả unknown/unavailable kèm thời điểm, không khẳng định service đã hỏng vĩnh viễn. Không đợi chuỗi cold start nhiều service để trả số 0.

Worker lastSeen từ claim/renew/status; đề xuất endpoint nội bộ báo worker status 60 giây khi đang được chủ động bật cho xử lý, **stale sau 180 giây**. Worker offline không làm public data biến mất. Đây là status heartbeat nghiên cứu/vận hành theo nhu cầu, không ping để né Render sleep. Lease job 5 phút và stale worker 180 giây là hai chính sách khác nhau.

Đề xuất giữ health sample trong memory Usage service, không thêm collection lịch sử. Sau restart sample là unknown cho tới kiểm tra mới. DB health do chính service sở hữu kiểm tra và trả health đã lọc; Monitoring không dùng credential đọc DB của service khác.

## 7. Nội dung cần duyệt

1. Payload/error/validation và giới hạn tài khoản/Manager actions ở mục 1–2.
2. Public POI/tombstone snapshot và browserId UUID localStorage dành riêng telemetry, các giới hạn định danh/fallback đã nêu.
3. Lifecycle telemetry khi message đảo thứ tự, endReason/schema bổ sung, health timeout/freshness và worker status ở mục 5–6.

Các đề xuất này không xác nhận code, provider integration hoặc tests đã đạt; không thay phạm vi ngoại tuyến, Android waiver hoặc mở Implementation. Format ngôn ngữ/voice/provider cụ thể, công cụ mã hóa và các schema hợp nhất vẫn cần hoàn thiện trước gate Design.

## Phê duyệt — DEC-077

Duy duyệt toàn bộ D-017: payload/errors/validation/account restrictions; public data/deletion snapshot/browser identity; telemetry ordering/schema/end reasons/health freshness. Đây là contract thiết kế; chưa có code hoặc benchmark mới. Các phần còn mở không tự được duyệt.
