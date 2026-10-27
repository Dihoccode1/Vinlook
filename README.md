# Vinlook — nền tảng du lịch đa ngôn ngữ

Monorepo dùng npm workspaces, React + Vite + TypeScript và Node.js + Express + SQL Server.

## Đã triển khai

- `apps/user-web`: bản đồ Leaflet/OpenStreetMap, tìm kiếm, lọc danh mục, phân trang, chọn marker và xem chi tiết POI.
- `services/poi-service`: API đọc POI từ SQL Server, validation, truy vấn có tham số, health/readiness.
- `services/api-gateway`: chuyển tiếp API POI và kiểm tra readiness của upstream.
- Migration có bảng theo dõi phiên bản; seed 3 POI mẫu có thể chạy lại.
- GitHub Actions: typecheck, test, build và kiểm thử tích hợp SQL Server.

Admin, monitor, GPS, routing, dịch và các service khác hiện còn là bộ khung. CI đã có cấu hình; CD chưa triển khai.

## Chạy local trên PowerShell

Yêu cầu Node.js >= 22.12 (khuyến nghị Node 24), npm và Docker Engine chạy Linux containers.

```powershell
npm ci
Copy-Item .env.example .env # chỉ làm khi chưa có .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

- Frontend: http://localhost:5173
- Gateway: http://localhost:4000/api/pois
- POI Service: http://localhost:4001/pois
- Readiness: http://localhost:4000/health/ready

Frontend chỉ hiển thị dữ liệu API thật, không tự thay bằng dữ liệu giả khi database lỗi.
Bản đồ cần mạng để tải tile OpenStreetMap; font có fallback khi Google Fonts không tải được.
Tile công cộng chỉ dùng cho phát triển; chọn nhà cung cấp và kiểm tra chính sách sử dụng trước production.
Vite proxy `/api` sang gateway trong môi trường dev; khi deploy cần cấu hình reverse proxy tương ứng.

`.env.example` chứa mật khẩu mẫu cho local. `.env` không được đưa vào Git.
Tài khoản `sa` chỉ dùng cho bootstrap và phát triển local; production cần credential migration riêng và tài khoản runtime chỉ có quyền đọc POI.
Mặc định local tin cậy chứng chỉ tự ký. Production dùng chứng chỉ hợp lệ và đặt `SQLSERVER_TRUST_CERTIFICATE=false`.
Không thay mật khẩu trong `.env` cho volume đã khởi tạo mà chưa đổi mật khẩu tương ứng trong SQL Server.
Không bật các endpoint backend local ra Internet khi chưa thêm phân quyền, rate limit và cấu hình triển khai.

## Kiểm tra

```powershell
npm run typecheck
npm test
npm run build
# Yêu cầu database đã migrate và seed:
npm run test:integration -w @tourism/poi-service
```

`npm test` kiểm tra API với repository giả lập, gồm lỗi upstream/database.
`test:integration` kiểm tra truy vấn SQL thật, Unicode, tìm kiếm, phân trang và ký tự đặc biệt.
CI chạy migration và seed hai lần để kiểm tra khả năng chạy lại trên database test riêng.

## Database

Mỗi service sở hữu database riêng; không query database service khác.
Hiện đã triển khai `PoiDb`; xem `docs/database/ownership.md` và `docs/api/pois.md`.
Dữ liệu seed là dữ liệu phát triển; cần duyệt nội dung và tọa độ trước khi xuất bản thực tế.
`npm run db:down` dừng SQL Server và giữ volume dữ liệu.

## Tài liệu tham khảo

- SQL Server container: https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker?view=sql-server-ver16
- Leaflet: https://leafletjs.com/examples/quick-start/
- Vite dev proxy: https://vite.dev/config/server-options#server-proxy
