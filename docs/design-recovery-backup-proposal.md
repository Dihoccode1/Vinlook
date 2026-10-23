# Vinlook — D-014: khôi phục Manager và sao lưu/khôi phục

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-074**. Truy vết REQ-020/026, UC-022/029/033/034, DEC-073. Đây là thiết kế runbook, chưa chạy thao tác trên tài khoản hoặc database thật.

## 1. Setup và khôi phục Manager

Đề xuất công cụ vận hành cục bộ thuộc Identity, không có endpoint reset Manager công khai. Chỉ người có quyền vận hành Identity và credential riêng mới chạy được; công cụ chỉ truy cập Identity DB, không dùng tài khoản của POI/Monitoring. Không tự giao người vận hành; Duy xác nhận người thực hiện theo từng sự cố.

- Setup: tạo Manager ban đầu đúng tài khoản đã xác minh; chỉ chạy khi chưa có Manager theo điều kiện bootstrap. Không biến người đăng ký đầu tiên thành Manager hoặc tự nâng role của email bất kỳ.
- Recovery: xác minh tài khoản Manager đích bằng runbook và quyền vận hành; cấp mã ngẫu nhiên một lần 15 phút giống cơ chế bảo mật D-007, không hiển thị hash/password hoặc tự thay email/role.
- Manager dùng mã để tự đặt mật khẩu mới qua luồng reset hiện có; tăng authVersion khi reset thành công. Không tự mở khóa tài khoản đang locked: unlock là quyết định riêng và phải audit.
- Ghi audit actor vận hành, thời điểm, tài khoản đích, lý do và kết quả; workSessionId null với operation ngoài phiên theo D-005. Đề xuất actorType=operator/account để không tạo Staff giả cho thao tác vận hành. Không ghi recovery code rõ vào log.
- Đề xuất giữ RecoveryCode.issuedBy nullable với mã do operator cấp, bổ sung issuedByOperator và AuditLog.actorType/operatorId cho sự kiện ngoài tài khoản; ràng buộc phải có đúng loại actor tương ứng. Đây là mở rộng trường cần duyệt, không âm thầm đổi model đã duyệt.

Không có quyền vận hành hợp lệ thì dừng recovery và báo cần người có quyền, không tạo backdoor/hardcoded password. Credential vận hành không đưa vào frontend, repo hoặc file backup nội dung.

## 2. Backup thủ công trước mỗi checkpoint MVP

Đề xuất MongoDB Database Tools (mongodump/mongorestore) cho ba logical DB và tải bản gốc của ảnh/audio cần giữ về máy nhóm. MongoDB nêu dump khi có write đồng thời có thể không phản ánh cùng một thời điểm nếu không có cơ chế nhất quán thích hợp: [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/). Cloudinary cho phép lấy URL bản gốc để tải: [download assets](https://cloudinary.com/documentation/ts_how_can_i_download_my_accounts_assets). Không chọn paid backup storage hoặc giả định Atlas Free cho phép mọi tùy chọn oplog.

**Đề xuất cửa sổ bảo trì có thông báo để ngừng toàn bộ writer:**

1. Ngăn mutation mới, dừng nhận job/upload mới; chờ giao dịch đang chạy kết thúc. Tạm dừng worker, outbox sender và các writer tự động, bao gồm presence/heartbeat/counters. Chỉ đóng dashboard không đủ bảo đảm không còn ghi.
2. Xác nhận writer đã dừng trước khi dump cả ba DB; không chạy thêm schema migration hoặc setup/recovery trong cửa sổ. Không chỉ bật banner UI rồi cho API tiếp tục ghi.
3. Từ snapshot lấy danh mục asset đang được tham chiếu, gồm published/draft/deleted/restorable và output còn cần giữ. Tải bản gốc, giữ publicId/type/version/format cùng SHA-256 và byteLength. Giữ dataset/manifest graph/package đã phát hành và commit/config phiên bản, không kèm secret.
4. Backup manifest ghi backupId, thời gian bắt đầu/kết thúc, DB/tool/app/schema versions, số bản ghi, danh sách asset, file hash và lỗi. Chỉ ghi complete khi đủ file và kiểm tra xong; thiếu media phải báo incomplete.
5. Lưu backup trong nơi riêng trên máy nhóm, giới hạn quyền đọc; mã hóa archive bằng công cụ miễn phí được chọn ở bước cấu hình, giữ khóa riêng. Không mặc định thư mục OneDrive đang đồng bộ là nơi lưu phù hợp. Bộ công cụ mã hóa và người giữ khóa chưa được chọn.
6. Mở lại writer sau khi xác nhận backup complete hoặc ghi nhận backup thất bại và tình trạng hệ thống. Không coi backup thất bại là đạt gate checkpoint. Du khách offline có gói đầy đủ vẫn dùng local; online có thể nhận thông báo/503 trong bảo trì.

Kỳ giữ dữ liệu 35 ngày + 7 ngày tối ưu không đổi; không tự xóa backup/asset trong kỳ này. Thời lượng bảo trì chưa đo, không hứa không gián đoạn hoặc tự đặt RPO/RTO chưa được duyệt.

## 3. Restore trial trước nghiệm thu cuối

Đề xuất thử khôi phục vào Mongo local replica set **tách biệt với Dev hiện hành và Prod**, vẫn thuộc công việc kiểm thử, không thêm một môi trường hosted/staging dài hạn.

1. Kiểm tra backup manifest, hash, tương thích versions và tài nguyên đích; không chạy restore nếu đường kết nối trỏ Production hoặc chứa namespace ngoài phạm vi thử đã xác nhận.
2. Khôi phục DB và kiểm tra counts/indexes/references. Không restore DB user/role/secret bằng giả định file dump nội dung đã có mọi cấu hình truy cập.
3. Tắt worker/outbox/egress provider trong bản trial: không gửi lại audit vào Production, không tạo audio/upload thật hoặc replay job snapshot ra dịch vụ ngoài.
4. Kiểm tra POI published/draft/deleted, đủ nội dung theo version, session/audit, asset local và checksum. Mô phỏng outbox giao lại chống trùng và stale lease bằng môi trường test.
5. Presence/listener snapshot cũ không được báo là khách hiện tại; dùng lastSeenAt/timeout. Job running có lease trước restore phải qua cơ chế expiry/reconciliation, không nhận result từ attempt cũ như còn quyền.
6. Ghi biên bản pass/fail, số liệu và thời gian khôi phục thực tế. Phép thử không thay đổi database Production. Không tự xóa môi trường trial hoặc backup gốc chỉ vì thử xong.

## 4. Khôi phục Production khi có sự cố

Là thao tác riêng cần Duy xác nhận target, backup, mất dữ liệu sau mốc snapshot và cửa sổ bảo trì; không suy từ phê duyệt runbook rằng được restore Production bất kỳ lúc nào. Sao lưu trạng thái hiện tại nếu còn đọc được trước khi thay thế.

Asset mất cần phục hồi đúng publicId/format/version hoặc cập nhật có kiểm soát các reference/package liên quan; không hứa reupload tự tái tạo mọi URL version cũ. Nếu không giữ được URL thì phải build lại gói và thông báo cập nhật; không sửa file version bất biến âm thầm. Khi chưa phục hồi đầy đủ, không báo POI/audio sẵn sàng.

Đối soát job/outbox/idempotency giữa ba DB cùng bộ backup trước mở writer. Xác nhận rotate credential hoặc key cần thiết, không để authVersion từ snapshot làm token cũ có hiệu lực ngoài ý muốn; đề xuất đổi JWT signing secret khi restore Production để buộc đăng nhập lại. Không tự bật worker và phát lại tất cả job.

## 5. Nội dung cần duyệt

1. Setup/recovery Manager bằng công cụ Identity cục bộ, mã một lần và các trường audit/operator bổ sung.
2. Backup thủ công có cửa sổ ngừng writer toàn hệ thống, dump ba DB + media/dataset manifest và lưu mã hóa trên máy nhóm; công cụ mã hóa chọn sau.
3. Restore trial tách biệt, không egress Production; Production restore phải xác nhận riêng, đối soát trạng thái và đổi JWT signing secret khi phục hồi.

Chưa tạo credential/công cụ recovery/backup/restore hoặc thao tác tài khoản. Gate Design tổng thể, phân công và Implementation chưa mở.

## Phê duyệt — DEC-074

Duy duyệt toàn bộ D-014, gồm recovery Manager qua Identity operator tool và trường actor/operator, backup dừng writers và dữ liệu/media manifests, restore trial tách biệt, Production restore xác nhận riêng và rotate JWT key. Chưa chọn công cụ mã hóa/người giữ khóa; chưa chạy thao tác recovery/backup/restore thật.
