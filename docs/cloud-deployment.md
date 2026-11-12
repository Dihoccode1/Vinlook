# Vinlook trên Vercel + Render Free + Supabase Free

Frontend giữ project Vercel Hobby hiện có. Bốn API giữ riêng module nghiệp vụ nhưng chạy trong một tiến trình Node trên một Render Web Service Free. Chỉ API Gateway lắng nghe cổng công khai; POI, Navigation và Translation dùng loopback. Supabase PostgreSQL lưu dữ liệu trong schema riêng `vinlook`; bucket riêng tư `vinlook-media` giữ audio. Ảnh đang lưu trong database tiếp tục được phục vụ qua API.

## Thiết lập và giới hạn chi phí

- Render: instance phải có `plan: free`, không gắn disk, không thêm thẻ, không nâng cấp workspace. 750 giờ chạy mỗi tháng dùng chung cho toàn workspace, gồm cả service khác đã có. Service ngủ sau 15 phút không có request. Không tạo cron ping để giữ thức. Khi hết quota, chấp nhận tạm ngừng hoặc chờ tháng mới.
- Supabase: organization phải là **Free**, không nâng cấp Pro, không thêm paid add-on. Quota hiện hành là 500 MB database, 1 GB Storage, 5 GB egress; project có thể tạm dừng khi ít hoạt động trong một tuần. Không tạo project mới để lách quota.
- Vercel: giữ Hobby; không bật paid fallback hoặc nâng cấp tự động.
- GitHub: repo public dùng standard Ubuntu runner. Backup mã hóa nằm trong quota Storage Free của Supabase; không upload backup thành GitHub artifact. Không dùng larger runner trả phí.

Không thể cam kết mọi thay đổi tài khoản sau này vẫn miễn phí: người quản trị cần giữ các lựa chọn trên. Khi kiểm tra backend trước mỗi release, script từ chối nếu Render service không còn thuộc workspace/repo đã cấu hình hoặc không còn gói `free`.

Nguồn: [Render Free](https://render.com/docs/free), [Supabase pricing](https://supabase.com/pricing), [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase).

## Dữ liệu và migration

File `.env.cloud` trên máy quản trị bị Git và Docker build context bỏ qua. Không đưa secret vào source, ảnh chụp, log, PR hoặc chat. `DATABASE_URL` dùng Supabase Session pooler cổng 5432; TLS kiểm chứng CA Supabase và hostname. Key Storage chỉ có ở backend. `VINLOOK_DATASET_ID` được tạo khi nhập dữ liệu, không thay đổi theo commit.

`scripts/backup-local.mjs` tạo backup SQL `COPY_ONLY` có `CHECKSUM`/`RESTORE VERIFYONLY`, bản xuất toàn bộ bảng và bản sao thư mục audio trong `.local-deploy/backups/cloud-source-*`. `scripts/import-cloud.mjs` chỉ nhập vào database đích rỗng, kiểm tra checksum snapshot, so từng giá trị (kể cả ảnh/audio binary, mật khẩu băm và ID hoa/thường), so tổng số bản ghi rồi mới commit và lưu receipt. Không chạy seed.

Trước khi đổi traffic, đối chiếu lại nguồn để tránh bỏ sót dữ liệu được thêm trong lúc chuyển. Giữ SQL volume và backup nguồn; không chạy `docker compose down -v`, không xóa volume và không thay mật khẩu SQL nguồn như một phần deploy.

Runtime cloud từ chối phục vụ nếu dataset ID không trùng. Migration có khóa, transaction và checksum; sửa file migration đã áp dụng sẽ bị từ chối. Trước/sau migration, hệ thống so fingerprint của toàn bộ giá trị cũ, rollback nếu có thay đổi hoặc mất bản ghi. Vì vậy migration thông thường phải bổ sung cấu trúc và giữ dữ liệu. Các thay đổi dữ liệu có chủ đích cần một quy trình riêng có backup và kiểm chứng, không bỏ chốt an toàn để deploy cho qua.

## Tự động deploy main

PR chạy format/typecheck/unit tests, integration SQL Server, integration PostgreSQL cloud và Docker builds. PR không nhận secret triển khai. Job cloud chỉ chạy trên `main` khi `VINLOOK_DEPLOY_ENABLED=true` và `VINLOOK_DEPLOY_TARGET=cloud`.

1. Runner GitHub-hosted tạo snapshot database mã hóa AES-256-GCM; backup được kiểm chứng trong bucket riêng tư của Supabase, không chứa plaintext hoặc key. Không tạo được backup thì dừng deploy.
2. Kiểm tra Render service đúng repo/workspace và gói Free; yêu cầu deploy đúng SHA.
3. Chờ backend mới, kiểm tra `/health/release` đúng SHA và các API đọc thật.
4. Build ba FE, stage deployment Vercel, kiểm tra trang/API, rồi promote domain chính.
5. So SHA frontend công khai với commit vừa triển khai.

Repository variables: `VINLOOK_DEPLOY_ENABLED`, `VINLOOK_DEPLOY_TARGET`, `VINLOOK_API_ORIGIN`, `VINLOOK_DATASET_ID`, `RENDER_SERVICE_ID`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SUPABASE_URL`. Environment `production` chỉ cho `main`; giữ tự động, không yêu cầu duyệt mỗi lần. Secrets: `DATABASE_URL`, `BACKUP_ENCRYPTION_KEY`, `RENDER_API_KEY`, `VERCEL_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`.

Render native auto-deploy tắt để workflow điều phối thứ tự và chỉ triển khai sau kiểm tra. Backend không chạy seed khi restart/redeploy. Ảnh/audio không phụ thuộc filesystem tạm của Render. Giữ backup encryption key riêng tại máy quản trị để có thể giải mã backup; không mất key khi thay máy.

Để kiểm tra hoặc lấy lại dữ liệu từ backup mã hóa trong Storage, tải file `.enc` về và chạy `node --env-file=.env.cloud scripts/decrypt-backup.mjs DUONG_DAN_FILE.enc .local-deploy/restore/snapshot.json`. Lệnh kiểm chứng tính toàn vẹn trước khi ghi, không ghi đè file cũ và không sửa database. Snapshot chứa schema version, dữ liệu và tham chiếu Storage; object media vẫn lưu riêng trong bucket. Không xóa project/bucket khi khôi phục. Các bản SQL `.bak` nguồn và thư mục audio trong backup ban đầu cũng được giữ trên máy quản trị.

## Sử dụng hằng ngày

Sau khi cutover thành công, chỉ push hoặc merge vào `main`, theo dõi GitHub Actions. Không cần bật máy, Docker, runner Windows hoặc Quick Tunnel. Nếu lâu không dùng, đánh thức Render bằng một lần truy cập; project Supabase bị pause cần resume trên dashboard. Không dùng paid upgrade để tự động xử lý quota.

Vercel: `https://vinlook-poc-web.vercel.app`, `/admin/`, `/monitor/`. Backend origin và service ID được lưu trong repository variables và file riêng `.local-deploy/cloud-service.json`. Trang `/release.json` của FE và `/health/release` của BE phải có cùng SHA. `node scripts/smoke.mjs https://vinlook-poc-web.vercel.app` kiểm tra API đọc, không thay đổi dữ liệu và không gọi TTS.

TTS mới vẫn cần credential provider có quota miễn phí được nhóm chủ động cấp. Không có API trả phí hoặc billing fallback được bật bởi quy trình chuyển cloud.

Backup được giữ trong thư mục `backups/` của bucket riêng tư. Khi quota Storage Free đầy, bước backup thất bại và deployment dừng; không mua thêm dung lượng. Nhóm có thể tải backup cũ về máy rồi chủ động quản lý dung lượng trên dashboard. Script deploy không tự xóa dữ liệu hoặc backup.
