# poi-service

Node.js + Express + TypeScript + SQL Server (`PoiDb`, cổng mặc định `4001`).

## Chức năng chính

- **API công khai cho du khách**:
  - `GET /pois`: tìm kiếm từ khóa, lọc danh mục và phân trang điểm tham quan đã xuất bản.
  - `GET /pois/:id`: xem chi tiết điểm tham quan theo mã (`POI001`) hoặc `slug`.
  - `GET /pois/:id/image`: tải ảnh minh họa nhị phân từ `dbo.poi_images` hỗ trợ bộ nhớ đệm `ETag` (`304 Not Modified`).
  - `GET /pois/qr/:token`: giải mã token QR sang địa điểm tham quan đang xuất bản.
- **API quản trị nội bộ (`/admin/*`, bảo vệ bằng khóa `x-admin-key`)**:
  - `GET /admin/stats`: thống kê tổng số POI, bản xuất bản, bản nháp, số POI có ảnh và phân bố theo danh mục.
  - `GET /admin/geocode`: tra cứu tọa độ GPS từ địa chỉ tại TP.HCM qua Nominatim.
  - `GET /admin/pois`, `POST /admin/pois`, `PUT /admin/pois/:id`, `DELETE /admin/pois/:id`: quản lý vòng đời địa điểm có kiểm soát đồng thời lạc quan (`updated_at`) và ghi nhật ký hệ thống (`dbo.system_logs`).
  - `POST /admin/pois/:id/qr`: khởi tạo hoặc lấy lại mã QR định danh của địa điểm.
- **Kiểm tra sức khỏe**: `/health/live` và `/health/ready`.
- Xem thêm `docs/api/pois.md` và `README.md` ở thư mục gốc.
