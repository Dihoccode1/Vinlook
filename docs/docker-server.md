# Chạy Vinlook trên máy cá nhân bằng Docker

## 1. Chuẩn bị

Mở Docker Desktop, chọn Linux containers. Chạy các lệnh ở thư mục gốc repo.
Giữ Docker Desktop chạy và tắt Sleep khi cần người khác truy cập website.

Nếu chưa có `.env`, copy từ `.env.example`; không ghi đè `.env` hiện tại.
Cấu hình `SQLSERVER_PASSWORD`, `ADMIN_API_KEY`, `ADMIN_PASSWORD_HASH` và các API key dịch/thuyết minh cần dùng.
Giữ nguyên mật khẩu SQL của volume đã khởi tạo. Mật khẩu admin hiện tại trong database được giữ nguyên khi chạy migration.
Không đưa `.env` hay token Tunnel vào Git hoặc Docker image.

## 2. Build và chạy

```powershell
npm run server:up
npm run server:status
```

Mở web tại <http://localhost:8080>, quản trị tại <http://localhost:8080/admin/>.
`WEB_PORT` trong `.env` đổi cổng web (mặc định 8080).
Đăng nhập quản trị production dùng cookie Secure; dùng `localhost` để thử local, và HTTPS khi truy cập bằng tên miền.

Stack gồm SQL Server, migration một lần, POI, Navigation, Translation, Gateway và Nginx.
Frontend là bản build, không phải Vite dev server. Nginx chuyển `/api/` tới Gateway trên cùng origin để phiên đăng nhập hoạt động.
Compose ghi đè các host/cổng service local bằng tên container, nên không cần sửa biến localhost trong `.env` đang dùng để phát triển.
Chỉ Nginx (8080) và SQL local (1433, giữ từ cấu hình cũ) được ánh xạ ra loopback máy chủ; backend không xuất cổng ra Internet.

Compose dùng chung thư mục project `infrastructure/docker` với cấu hình database local hiện tại:
trên máy này là project `docker`, volume `docker_sqlserver-data`.
Không đổi project name bằng `-p` hoặc `COMPOSE_PROJECT_NAME` nếu muốn tiếp tục dùng database đó.
Migration tự chạy, dừng triển khai nếu thất bại; không tự seed hoặc thay dữ liệu nội dung.
Trên máy mới/database trống, cần nạp nội dung từ backup hoặc seed riêng.

Âm thanh dùng bind mount `services/translation-service/storage/narrations` để giữ file hiện tại và file mới.
SQL dùng volume `sqlserver-data`. Các bản mapping khi đổi mã ID giữ trong `.local-backups`.
Backup database và thư mục âm thanh trước khi nâng cấp dữ liệu quan trọng; volume không thay thế backup.

## 3. Đưa ra Internet bằng Cloudflare Tunnel

1. Dùng tên miền đang quản lý trên Cloudflare.
2. Trong Cloudflare dashboard, tạo một Tunnel loại Cloudflared (remotely managed).
3. Copy token vào `.env`: `CLOUDFLARE_TUNNEL_TOKEN=...`.
4. Thêm published application route, ví dụ `vinlook.tenmiencuaban.com`, service HTTP `web:80`.
   Không dùng `localhost:8080` ở đây vì cloudflared chạy trong container riêng.
5. Chạy:

```powershell
npm run server:tunnel
```

Web: `https://vinlook.tenmiencuaban.com/`.
Admin: `https://vinlook.tenmiencuaban.com/admin/`.
Token và domain không có trong repo; chỉ bật profile Tunnel sau khi cấu hình xong.
Không cần mở port router. Máy/Docker/Tunnel phải chạy để website truy cập được.

Trong màn tạo QR, nhập URL HTTPS của web bản đồ. Nếu muốn mặc định theo tên miền,
đặt `VITE_PUBLIC_WEB_URL=https://vinlook.tenmiencuaban.com` trong `.env` rồi chạy lại `npm run server:up` để build frontend.
Xóa giá trị URL cũ đã lưu trong màn QR nếu trình duyệt còn nhớ localhost.

Tài liệu: <https://developers.cloudflare.com/tunnel/get-started/>.

## 4. Vận hành

```powershell
# Xem container, kể cả migration đã kết thúc thành công
npm run server:status
# Xem log; Ctrl+C chỉ thoát việc xem log
npm run server:logs
# Build và cập nhật sau khi sửa code
npm run server:up
# Tạm ngắt truy cập Internet
npm run server:tunnel:stop
# Dừng stack, giữ volume dữ liệu
npm run server:down
```

Không dùng `down -v` nếu cần giữ database. Khi khởi động lại Docker, các service có restart policy tự chạy;
migration chỉ chạy trong quy trình triển khai. Nếu Tunnel đã bật, nó cũng tự chạy lại.
`npm run dev` vẫn dùng cổng 5173/5174/4000–4003 và không xung đột với cổng nội bộ Docker.

Nếu đăng nhập không được: kiểm tra Gateway/SQL trong log, tài khoản hiện có trong database và cookie trên `localhost`/HTTPS.
Nếu build lỗi: kiểm tra Docker có mạng tải Node/Nginx/npm. Nếu web báo 502: kiểm tra health của các service.
Gateway vẫn cần mạng tới nhà cung cấp bản đồ, dịch và TTS theo cấu hình dự án.

SQL Server hiện dùng edition Developer theo compose cũ, phù hợp phát triển/demo; triển khai kinh doanh cần edition/license phù hợp.
CD tự động từ GitHub chưa được thêm; các lệnh trên triển khai trực tiếp phiên bản source trên máy.
