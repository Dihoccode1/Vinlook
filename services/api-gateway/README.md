# api-gateway

Node.js + Express + TypeScript. Cổng giao tiếp tập trung (API Gateway Pattern) của nền tảng Vinlook (cổng mặc định `4000`).

## Chức năng chính

- **Xác thực & phân quyền quản trị (`/api/admin/auth/*`)**: đăng nhập/đăng xuất qua cookie phiên `HttpOnly` (`SameSite=Strict`), chống tấn công vét cạn mật khẩu, kiểm tra header chống CSRF `x-vinlook-admin: 1` và phân quyền rạch ròi giữa `admin` và `staff`.
- **Quản lý tài khoản nội bộ (`/api/admin/users`)**: danh sách, tạo mới, cập nhật vai trò/mật khẩu, khóa/mở khóa tài khoản và thu hồi phiên đăng nhập tức thì trên SQL Server.
- **Theo dõi hoạt động & Giám sát (`/api/activity/heartbeat`, `/api/admin/activity`, `/api/admin/monitor/*`)**: đếm số du khách đang truy cập và đang nghe thuyết minh theo thời gian thực, kiểm tra độ trễ các microservice, trạng thái CI/CD GitHub Actions và nhật ký sự kiện.
- **Chuyển tiếp yêu cầu (Reverse Proxy)**:
  - `/api/admin/*` → `POI_SERVICE_URL` (`/admin/*`) kèm header xác thực nội bộ.
  - `GET /api/pois`, `GET /api/pois/:id`, `GET /api/pois/:id/image`, `GET /api/pois/qr/:token` → `POI_SERVICE_URL` (giữ nguyên ETag để trình duyệt lưu đệm ảnh).
  - `POST /api/routes` → `NAVIGATION_SERVICE_URL`.
  - `GET /api/languages`, `POST /api/pois/:id/translation`, `POST /api/pois/:id/narration` → `TRANSLATION_SERVICE_URL`.
- **Kiểm tra sức khỏe**: `/health`, `/health/live`, `/health/ready`.
