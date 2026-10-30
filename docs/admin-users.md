# Tài khoản dashboard

Tại trang quản trị, Admin mở **Quản lý tài khoản** để tạo tài khoản, thay đổi tên đăng nhập/họ tên, đặt mật khẩu mới, khóa/mở khóa và thay đổi quyền.

| Quyền | Tổng quan | Quản lý địa điểm | Giám sát hệ thống | Quản lý tài khoản |
| --- | --- | --- | --- | --- |
| Staff | Có | Có | Không | Không |
| Admin | Có | Có | Có | Có |

Quyền được kiểm tra tại gateway cho từng yêu cầu, ngoài việc ẩn menu trong giao diện. Tài khoản bị khóa không thể đăng nhập; phiên cũ bị thu hồi khi đổi mật khẩu, quyền hoặc trạng thái. Vai trò được đọc từ SQL mỗi lần xác thực phiên.

Mật khẩu được băm bằng scrypt với salt riêng; API danh sách không trả mật khẩu hoặc mã băm. Để trống mật khẩu khi chỉnh sửa sẽ giữ mật khẩu hiện tại. Tên đăng nhập dài 3–100 ký tự, chỉ gồm chữ Latin, số, dấu gạch dưới, chấm và gạch ngang; mật khẩu dài 5–200 ký tự.

Admin chỉ được tự khóa tài khoản Admin của mình, không được khóa hoặc hạ quyền Admin khác. Admin vẫn khóa/mở khóa Staff và mở khóa Admin đã bị khóa được. Tự khóa thu hồi mọi phiên, bao gồm phiên hiện tại; không giới hạn số Admin còn hoạt động. Không được tự hạ quyền. Thao tác quản lý tài khoản được ghi vào system_logs, không ghi mật khẩu.

Migration `007_staff_role.sql` chuyển quyền `editor` cũ thành `staff` và giới hạn hai quyền `admin`, `staff`. Dùng lại bảng users và admin_sessions, không tạo thêm bảng.

Kiểm thử đơn vị: `npm run test -w @tourism/api-gateway`.

Kiểm thử tích hợp sau khi SQL Server và POI service đang chạy: `npx tsx --env-file=.env --test services/api-gateway/tests/integration/users.test.ts`. Bài kiểm thử tạo tài khoản riêng và dọn dữ liệu thử sau khi chạy.
