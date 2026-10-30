# QR cho địa điểm

Trong Dashboard → Quản lý địa điểm, chọn **Mã QR** ở hàng POI. Popup hiển thị QR, đường dẫn, nút sao chép và tải PNG 1024px. Staff và Admin đều dùng được công cụ này. QR tải về là ảnh tạo tại trình duyệt bằng `qrcode`, không gửi link tới dịch vụ tạo QR bên ngoài.

`poi_qr_codes` lưu một bản ghi cho mỗi POI. Token gồm 16 byte ngẫu nhiên mật mã, biểu diễn thành 32 ký tự hex. Khóa chính `poi_id` và unique `qr_token` bảo đảm không trùng. Tạo POI từ dashboard lưu QR cùng transaction với POI. Mở lại popup giữ nguyên token và thời điểm tạo. QR không hết hạn tự động. `qr_image_url` để NULL vì ảnh được tạo động.

Để bổ sung QR cho dữ liệu seed/import cũ, chạy `npm run qr:prepare -w @tourism/poi-service`. Lệnh tạo các bản ghi còn thiếu và giữ nguyên mã đã có.

API:
- `POST /api/admin/pois/:id/qr`: đăng nhập Staff/Admin, trả token và `qr_path`, tạo nếu chưa có.
- `GET /api/pois/qr/:token`: công khai, trả thông tin POI đã xuất bản; mã không tồn tại hoặc POI là bản nháp trả 404.
- `/qr/:token` trên web khách: mở bản đồ và chi tiết POI, không cần đăng nhập/GPS. Không tự phát audio.

Nhập **Địa chỉ web bản đồ** trong popup, hoặc cấu hình `VITE_PUBLIC_WEB_URL=https://tenmien.example` trước khi build admin. Đây là origin web khách, không phải dashboard hay API gateway. Địa chỉ nhập trong popup được lưu ở trình duyệt quản trị. Chỉ nhận HTTP/HTTPS, không nhận user/password, đường dẫn con, query hoặc fragment.

Khi chạy local ở cổng 5174, mặc định QR dùng cổng web khách 5173 cùng host. `localhost`/`127.0.0.1` chỉ dùng trên máy hiện tại. Điện thoại cần địa chỉ LAN, tunnel hoặc tên miền mà nó truy cập được. Khi đổi domain phải tạo lại ảnh QR với địa chỉ mới trước khi in; token không đổi nhưng QR in cũ vẫn chứa domain cũ.

Khi deploy, web server phải phục vụ SPA `index.html` cho `/qr/*` (ví dụ Nginx `try_files $uri $uri/ /index.html;`) và proxy `/api` tới gateway. Vite dev có sẵn fallback này.

Kiểm chứng: unit test token/URL/quyền Staff, integration SQL tạo đồng thời/unique/token ổn định/ẩn bản nháp, mở link thực tế đến đúng chi tiết POI trên web khách. Popup đã kiểm tra ở 390×740.
