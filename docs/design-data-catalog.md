# Vinlook — danh mục dữ liệu hợp nhất, review D-021

Ngày 23/10/2026. Bản tổng hợp từ D-004/005/007/013/014/017 đã duyệt. **Chờ duyệt bản hợp nhất**, không phải schema Mongoose đã tạo. Tên id ánh xạ `_id` ObjectId; tham chiếu xuyên service là logical ID, không có cross-DB populate/joins. UTC cho thời điểm, ngày phiên Asia/Ho_Chi_Minh.

## Identity DB

| Entity | Fields đã được trình duyệt | Ràng buộc/current semantics |
|---|---|---|
| StaffAccount | id; fullName; email; passwordHash; role; status; authVersion; createdAt; updatedAt | email unique chuẩn hóa, Staff/Manager, pending/active/locked; authVersion tăng khi reset; không confirmPassword trong DB |
| WorkSession | id; staffId; workDateVN; status; openedAt; closedAt | unique staffId/date; open/closed; closedAt null khi mở; mở lại cùng ngày giữ ID |
| AuditLog | id; eventId; actorType; actorId; operatorId; workSessionId; action; poiId; occurredAt; receivedAt; result | eventId unique; actor account hoặc operator đúng loại; session null cho operation ngoài phiên đã duyệt; thời điểm gốc khác receivedAt |
| RecoveryCode | id; staffId; codeHash; expiresAt; usedAt; issuedBy; issuedByOperator | one-use 15 phút; issuer account hoặc operator; không giữ mã rõ; expiry kiểm tra tại API |
| AuthRateLimit | id; key; windowStart; count; expiresAt | key HMAC của tài khoản/IP+operation; không IP rõ; lưu server counter, có thể dọn expired theo ngoại lệ D-007 |

## POI DB

| Entity | Fields đã được trình duyệt | Ràng buộc/current semantics |
|---|---|---|
| POI | id; publishedRevisionId; deletedAt; deletedBy; createdAt | soft delete; pointer null trước publish; deletedAt/by cùng null hoặc cùng có |
| POIRevision | id; poiId; revisionNumber; editVersion; sourceVersion; status; nameEN; location; entrance; thumbnailAsset; sourceTextEN; createdBy; createdAt; updatedAt | unique poiId/revisionNumber; tối đa một draft/in_review; published bất biến; location/entrance GeoJSON Point riêng |
| LocalizedContent | id; revisionId; languageCode; sourceVersion tham chiếu; textVersion; text; audioAsset; durationSeconds; reviewStatus; reviewedBy; reviewedAt | unique revision/language; 0–16 khi xử lý, đủ16 khi publish; audio tham chiếu đúng textVersion; pending/approved/changes_required |
| ProcessingJob | id; revisionId; languageCode; taskType; inputVersion; inputSnapshot; status; attemptId; leaseOwner; leaseExpiresAt; resultRef; error; requestedBy; workSessionId | queued/running/succeeded/failed/waiting_quota; snapshot/version/attempt không được dùng để ghi đè input mới; error đã lọc secret |
| AuditOutbox | id; eventId; payload; createdAt; deliveredAt; nextAttemptAt; attemptCount | unique eventId; mutation+outbox trong transaction POI DB; giữ pending tới xác nhận; sender không ghi DB Identity |
| IdempotencyRecord | id; actorId; operation; key; requestHash; status; responseStatus; responseBody; createdAt; expiresAt | unique actor/operation/key; in_progress/completed; 24 giờ cho response replay; không tự xóa in_progress mà chưa đối soát |

Asset reference chứa publicId/URL/format và thông tin cần kiểm tra đã nêu D-004/013; không binary trong Mongo. Text/asset có thể thiếu trong draft nhưng gate publish bắt buộc đầy đủ. Locale/voice registry phiên bản thuộc cấu hình đã duyệt D-018; không tạo thêm collection registry từ bản này.

## Usage DB

| Entity | Fields đã được trình duyệt | Ràng buộc/current semantics |
|---|---|---|
| BrowserPresence | id; browserId; lastSeenAt | browserId UUID unique, server timestamp, quá90 giây loại khỏi count |
| ListeningSession | id; browserId; playbackId; poiId; languageCode; startedAt; lastSeenAt; endedAt; endReason | unique playbackId; Pause không end; end reason completed/page_closed/closed/replaced; end-before-start tombstone được phép thiếu start-only fields, late start không hồi sinh |

Health samples chỉ memory, không thêm collection. Không vị trí/GPS lịch sử, không IP làm visitor identity. Định danh localStorage UUID là dữ liệu du khách riêng, không token nhân viên.

## Kiểu dữ liệu và constraints để triển khai

- ID là ObjectId trong DB; browserId/playbackId/eventId/attemptId là opaque identifier theo contract, không dùng giá trị từ client làm quyền hạn. Role/status/taskType là enum đã duyệt, version/counter là số nguyên không âm, tọa độ/time/duration phải finite/hợp lệ.
- JSON snapshot/payload/result có schema allowlist theo loại operation, không Mongo Mixed tùy ý để né validation. Không trả internal snapshot/lease/secret qua public endpoint.
- Một working revision phải được bảo vệ đồng thời ở API và DB bằng index/transaction phù hợp. Không dùng unique(poiId,status) rồi cho cả draft lẫn in_review cùng tồn tại.
- Indexes nền D-005 giữ nguyên và bổ sung ràng buộc tương ứng các trường đã duyệt. Đo tổng data+indexes trong Atlas Free; không index mọi field hoặc tạo text-search service mới.
- Không TTL tự xóa POI/revision/media/audit trong kỳ35+7. AuthRateLimit expiry có ngoại lệ dọn đã duyệt; IdempotencyRecord hết hạn replay không đồng nghĩa cho phép xóa state đang chưa xác định kết quả.

## Chi tiết kỹ thuật cần xác nhận trong D-021

Để triển khai cap nhận lại lease ba lần, đề xuất field **ProcessingJob.reclaimCount** (integer≥0, tăng nguyên tử khi reclaim, reset chỉ khi Staff retry tạo chu kỳ xử lý được audit). Trường này chưa có tên cụ thể trong D-007; cần Duy duyệt tại D-021 trước khi thêm schema.

Để ràng buộc audio với text và registry, đề xuất metadata trong audioAsset gồm **textVersion, registryVersion, voiceOrModelId** bên cạnh publicId/URL/format/duration; chỉ publish khi khớp. Đây là cụ thể hóa phụ thuộc D-013/018, cần duyệt cấu trúc tại D-021; không dùng URL ngẫu nhiên làm bằng chứng đúng version.

Không tự thêm bảng task/milestone hay dữ liệu quản lý dự án vào Mongo; GitHub là nơi quản lý công việc.
