# Mã định danh ngắn

| Thực thể | Mã ví dụ |
|---|---|
| pois | POI001 |
| users | USR001 |
| visit_sessions | VST001 |
| poi_translations | TRN001 |
| poi_narrations | AUD001 |

Các khóa ngoại dùng cùng mã với bản ghi được tham chiếu, bao gồm `poi_qr_codes.poi_id`. ID log và sự kiện giữ nguyên BIGINT tăng dần vì đã ngắn. `admin_sessions.token_hash`, `qr_token`, mã heartbeat phía trình duyệt và hash nội dung không phải ID thực thể cần đánh số; giữ nguyên.

ID mới được cấp bằng SQL SEQUENCE và định dạng tối thiểu ba chữ số. Sau 999 tiếp tục 1000, không cắt số, không quay vòng. Sequence có thể có khoảng trống khi rollback hoặc yêu cầu bị hủy.

Chạy `npm run db:migrate` tại thư mục gốc: migrate hai DB rồi chuyển mã đồng bộ bằng `database/short-ids.ts`. Chạy lại không đánh số lại dữ liệu. `npm run db:short-ids` dành cho DB đã migrate đầy đủ. Sau đó có thể chạy `npm run db:seed`.

Trước khi chuyển DB đang có dữ liệu, sao lưu hai DB bằng `npx tsx --env-file=.env database/backup-before-erd.ts`. Quá trình chuyển dùng một transaction xuyên hai DB trên cùng SQL Server, dựng lại index và FK với kiểm tra dữ liệu. Bản đồ mã cũ/mới được lưu trong `.local-backups/short-ids-*/mapping.json`, không đưa lên Git. Audio fallback được sao chép sang thư mục mã mới; không ghi đè file đã có. Các cột binary và nội dung dịch không bị thay đổi.

URL ảnh và API dùng mã mới. Tải lại các tab đang mở sau khi nâng cấp. URL hoặc dữ liệu trình duyệt đã lưu bằng UUID cũ không được tự chuyển tiếp.
