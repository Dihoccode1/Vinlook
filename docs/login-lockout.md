# Giới hạn đăng nhập dashboard

- Sai hai lần đầu, API trả 401.
- Sai lần thứ ba, API trả 423, khóa tài khoản, thu hồi các phiên đăng nhập và ghi nhật ký.

Đăng nhập thành công đặt bộ đếm về 0.

Migration `011_login_lockout.sql` bổ sung `failed_login_count`, `login_retry_at` (UTC, nullable), `login_locked` vào bảng `users`, không thêm bảng mới. Bộ đếm được lưu theo tài khoản trong cơ sở dữ liệu và được khóa hàng trong lúc kiểm tra mật khẩu. Trạng thái giữ nguyên khi đổi IP, trình duyệt hoặc khởi động lại gateway.

Admin khác mở khóa bằng nút **Mở khóa** trong Quản lý tài khoản (`PATCH /api/admin/users/:id/status`, status active). Thao tác đặt bộ đếm về 0, xóa thời hạn chờ và cờ tự khóa, ghi nhật ký. Staff và chính tài khoản bị khóa không được mở. Admin khác có thể mở tài khoản đang khóa bất kể lý do khóa, gồm tự khóa hoặc sai mật khẩu 3 lần. Admin được khóa và mở khóa Admin khác qua API trạng thái; không được chỉnh sửa thông tin, đổi mật khẩu hay hạ quyền Admin khác. PUT chỉnh sửa tài khoản không được dùng để vượt qua cơ chế này. Mở khóa không khôi phục phiên đã bị thu hồi; tài khoản phải đăng nhập lại.

Kiểm thử: unit test kiểm tra ngưỡng 3 lần và đặt lại bộ đếm, integration SQL trên tài khoản riêng cho đếm đồng thời, khôi phục trạng thái qua app mới, thu hồi phiên, và Admin khác mở khóa. Không kiểm thử sai mật khẩu trên tài khoản thật.
