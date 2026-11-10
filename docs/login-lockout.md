# Giới hạn đăng nhập dashboard

- Sai lần 1–4: trả 401.
- Sai lần thứ 5: trả 429, chờ 30 giây.
- Sai lần 6–9 sau khi hết chờ: trả 401.
- Sai lần thứ 10: trả 429, chờ 60 giây.
- Sai lần 11–14 sau khi hết chờ: trả 401.
- Sai lần thứ 15: trả 423, đặt `status=disabled`, `login_locked=1`, thu hồi các phiên đăng nhập và ghi nhật ký.

Trong thời gian chờ, cả mật khẩu đúng cũng bị chặn; các request bị chặn không tăng bộ đếm. Hết thời gian chờ giữ nguyên số lần sai để tiếp tục đến mốc kế tiếp. Đăng nhập thành công đặt bộ đếm về 0.

Migration `011_login_lockout.sql` bổ sung `failed_login_count`, `login_retry_at` (UTC, nullable), `login_locked` vào bảng `users`, không thêm bảng mới. Bộ đếm được lưu theo tài khoản trong SQL Server và được khóa hàng trong lúc kiểm tra mật khẩu. Trạng thái giữ nguyên khi đổi IP, trình duyệt hoặc khởi động lại gateway. Giờ chờ lấy theo SQL Server.

Admin khác mở khóa bằng nút **Mở khóa** trong Quản lý tài khoản (`PATCH /api/admin/users/:id/status`, status active). Thao tác đặt bộ đếm về 0, xóa thời hạn chờ và cờ tự khóa, ghi nhật ký. Staff và chính tài khoản bị khóa không được mở. Admin khác có thể mở tài khoản đang khóa bất kể lý do khóa, gồm tự khóa hoặc sai mật khẩu 15 lần. Admin được khóa và mở khóa Admin khác qua API trạng thái; không được chỉnh sửa thông tin, đổi mật khẩu hay hạ quyền Admin khác. PUT chỉnh sửa tài khoản không được dùng để vượt qua cơ chế này. Mở khóa không khôi phục phiên đã bị thu hồi; tài khoản phải đăng nhập lại.

Giao diện đăng nhập hiển thị đếm ngược trên nút gửi theo `Retry-After`. Tải lại trang không bỏ được giới hạn vì backend luôn kiểm tra DB.

Kiểm thử: unit test với đồng hồ giả cho các ranh giới 30/60 giây, integration SQL trên tài khoản riêng cho đếm đồng thời, khôi phục trạng thái qua app mới, thu hồi phiên, và Admin khác mở khóa. Không kiểm thử sai mật khẩu trên tài khoản thật.
