# Vinlook — D-005: ràng buộc, index và trạng thái dữ liệu

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-055**. Dựa trên D-004/DEC-054; chưa tạo schema, database hoặc code ứng dụng.

## 1. Kiểu dữ liệu và ràng buộc

Các trường của D-004 được giữ làm nền. Đề xuất `id` là MongoDB `_id` kiểu ObjectId; Date lưu UTC; ID xuyên service truyền chuỗi; trường chưa phát sinh như `endedAt`, `deletedAt`, `deliveredAt` dùng null. Không đặt TTL tự xóa dữ liệu trong thời gian bảo lưu đã duyệt.

| Nhóm | Ràng buộc đề xuất |
|---|---|
| Account | fullName/email/passwordHash/role/status bắt buộc; email trim và lowercase để kiểm tra duy nhất; confirmPassword chỉ kiểm tra ở request, không lưu; không trim hoặc đổi chữ hoa/thường của mật khẩu |
| WorkSession | staffId, workDateVN dạng YYYY-MM-DD, status, openedAt bắt buộc; closedAt null khi mở; mở lại phiên giữ nguyên id và ngày |
| Audit | eventId, actorId, workSessionId, action, occurredAt, receivedAt, result bắt buộc cho thao tác trong phiên; poiId null với thao tác tài khoản; setup/khôi phục Manager ngoài phiên dùng workSessionId null và ghi rõ loại sự kiện |
| Recovery | codeHash, staffId, issuedBy, expiresAt bắt buộc; usedAt null trước khi dùng; kiểm tra thời hạn ở API kể cả khi bản ghi còn trong database |
| POI | publishedRevisionId null trước lần công khai đầu; deletedAt/deletedBy cùng null hoặc cùng có giá trị; 15 POI là dữ liệu khởi tạo, không phải giới hạn số bản ghi |
| Revision | poiId/revisionNumber/nameEN/location/sourceTextEN/status/createdBy bắt buộc; thumbnail phải có trước khi công khai; GeoJSON Point có longitude trong [-180,180], latitude trong [-90,90]; kiểm tra thuộc phạm vi dự án khi nhập nội dung |
| Localized | revisionId/languageCode bắt buộc; languageCode thuộc danh mục 16 ngôn ngữ đã duyệt; text/audio có thể thiếu trong lúc xử lý; công khai cần đủ text, audio, thời lượng 90–150 giây và duyệt cho cả 16 |
| Job | revisionId/languageCode/taskType/inputVersion/status/requestedBy/workSessionId bắt buộc; leaseOwner/leaseExpiresAt/attemptId chỉ có khi đang xử lý; error không chứa credential hoặc dữ liệu mật khẩu |
| Outbox | eventId/payload/createdAt bắt buộc; payload giữ actor, phiên gốc, POI, thời điểm, thao tác và kết quả; deliveredAt null tới khi bên nhận xác nhận |
| Presence/listening | browserId bắt buộc; playbackId duy nhất cho từng lượt phát; startedAt/lastSeenAt do server ghi nhận, không tin thời gian client để xác định online; không lưu tọa độ/IP làm định danh |

Đề xuất thêm `updatedAt` và số phiên bản chỉnh sửa `editVersion` cho revision. Mỗi lần sửa tăng editVersion bằng kiểm tra giá trị mong đợi để phát hiện hai người sửa đồng thời. Job lưu inputVersion tương ứng: kết quả cũ không ghi đè input mới. Cách tạo snapshot và hủy hiệu lực nội dung khi sửa sẽ đặc tả ở API.

## 2. Index đề xuất

| Collection | Index |
|---|---|
| StaffAccount | unique(email) |
| WorkSession | unique(staffId, workDateVN) |
| AuditLog | unique(eventId); (workSessionId, occurredAt); (actorId, occurredAt) |
| RecoveryCode | (staffId, expiresAt); không TTL |
| POI | (deletedAt) |
| POIRevision | unique(poiId, revisionNumber); (location: 2dsphere); (poiId, status) |
| LocalizedContent | unique(revisionId, languageCode) |
| ProcessingJob | (status, leaseExpiresAt); (revisionId, languageCode, taskType) |
| AuditOutbox | unique(eventId); (deliveredAt, nextAttemptAt) |
| BrowserPresence | unique(browserId); (lastSeenAt) |
| ListeningSession | unique(playbackId); (browserId, endedAt, lastSeenAt) |

Không thêm index unique cho job theo revision/ngôn ngữ vì một nội dung có thể được yêu cầu xử lý lại. API phải ngăn tạo công việc tương đương đang hoạt động. Search theo tên POI sẽ đặc tả cùng API; chưa chọn Atlas Search hoặc nhà cung cấp tìm kiếm mới. Các index cần đo dung lượng trong giới hạn Atlas Free, chưa có bằng chứng hiệu năng.

## 3. Trạng thái và chuyển trạng thái

| Đối tượng | Đề xuất |
|---|---|
| Account | pending → active khi Manager duyệt; active → locked; locked → active khi mở khóa; không xóa tài khoản để bỏ lịch sử |
| WorkSession | open → closed thủ công/00:00 VN; closed → open chỉ khi cùng ngày VN; thao tác kiểm tra ngày tại API để không phụ thuộc scheduler thức đúng nửa đêm |
| Revision | draft → in_review khi gửi duyệt; in_review → draft khi cần sửa; in_review → published chỉ Manager và đủ điều kiện; bản published bất biến, sửa tạo revision draft khác |
| LocalizedContent | pending → approved hoặc changes_required sau kiểm tra; sửa text/audio đưa lại pending; không giữ nhãn approved trên nội dung đã đổi |
| Job | queued → running khi nhận lease; running → succeeded, failed hoặc waiting_quota; lease hết hạn cho nhận lại cùng job với attemptId mới; failed/waiting_quota chỉ được đưa queued khi nhân viên chủ động retry |
| Outbox | chưa giao khi deliveredAt null; giao thành công thì ghi deliveredAt; lỗi giữ nguyên pending và cập nhật lần gửi, không bỏ sự kiện |
| ListeningSession | kết thúc khi endedAt có giá trị; pause giữ lượt mở; quá 90 giây không cập nhật thì loại khỏi số hiện tại dù chưa có tín hiệu kết thúc |

POI bị soft delete phải bị ẩn dù revision vẫn published. Restore tạo bản nháp từ nội dung giữ lại, không tự công khai hoặc tự phục hồi trạng thái duyệt. Bản published cũ vẫn có thể phục vụ khi bản nháp mới đang xử lý, trừ POI đã xóa. Tối đa một bản nháp draft hoặc in_review mỗi POI, đã duyệt tại DEC-055.

## 4. Nội dung đã duyệt tại DEC-055

1. Duyệt các kiểu/ràng buộc/index/trạng thái và trường bổ sung editVersion ở trên để làm cơ sở thiết kế API.
2. Đề xuất **tối đa một bản nháp đang làm cho mỗi POI** (draft hoặc in_review); sửa đồng thời báo xung đột, người sửa tải bản mới trước khi tiếp tục. Bản published trước đó được giữ nguyên.

Thời hạn mã phục hồi, minimum password, JWT algorithm, lease/poll/retry, xác thực service, API contract, giới hạn lưu và deployment vẫn chờ các bước thiết kế tiếp theo. Duyệt D-005 không xác nhận đã đạt quota, performance hoặc hoàn tất Design.

