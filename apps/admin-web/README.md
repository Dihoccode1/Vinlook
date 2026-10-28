# Vinlook Admin

Dashboard local quản lý POI, chạy tại http://127.0.0.1:5174/.

- Tổng quan số địa điểm, đã xuất bản, bản nháp, ảnh và phân bố danh mục từ SQL Server.
- Tìm kiếm theo tên/địa chỉ, lọc danh mục/trạng thái và phân trang.
- Thêm/sửa tên, slug, địa chỉ, tọa độ, danh mục, ngôn ngữ và nội dung gốc.
- Upload ảnh JPG/PNG/WebP tối đa 5 MB, kèm ghi công và nguồn/giấy phép. Nội dung ảnh lưu trong `PoiDb.dbo.PoiImages`, không lưu base64 trong database.
- Xuất bản/ẩn địa điểm. Bản nháp không xuất hiện trong API danh sách/chi tiết dành cho khách.
- Kiểm tra `updatedAt` để từ chối ghi đè khi có người khác sửa trước. Sửa nội dung gốc làm hash bản dịch/audio cũ không còn khớp.

## Chạy local

Tạo `ADMIN_API_KEY` ngẫu nhiên trong `.env` gốc, không commit. Chạy `npm run db:up`, `npm run dev` từ root; hoặc `npm run dev -w @tourism/admin-web` khi các backend đã chạy. Root dev khởi động cả user-web (5173) và admin-web (5174).

Vite chỉ chuyển tiếp API. Gateway kiểm tra phiên đăng nhập trước mọi `/api/admin/*`, sau đó gắn key nội bộ khi gọi POI service. Không chấp nhận key do trình duyệt gửi để bỏ qua đăng nhập. Key và hash mật khẩu không dùng tiền tố `VITE_`, không nằm trong bundle frontend.

Đã có tài khoản quản trị local. Cấu hình `ADMIN_USERNAME` và `ADMIN_PASSWORD_HASH` trong `.env` gốc; mật khẩu băm scrypt dạng salt:hash. Tài khoản nằm trong `PoiDb.dbo.Users`; migration chỉ seed từ cấu hình nếu tài khoản chưa tồn tại, không ghi đè mật khẩu. Phiên 8 giờ lưu hash token trong `PoiDb.dbo.AdminSessions`, cookie HttpOnly/SameSite=Strict, Secure khi NODE_ENV=production. Restart gateway không làm mất phiên. Đăng nhập/đăng xuất và chỉnh sửa POI có nhật ký DB. Sai 5 lần trong 15 phút bị giới hạn theo IP. Các yêu cầu thay đổi dữ liệu cần header `x-vinlook-admin: 1`. Chưa có phân quyền nhiều tài khoản hoặc chức năng đổi mật khẩu trong UI.

## API

Gateway chuyển `/api/admin/*` tới POI service `/admin/*`, giữ header `x-admin-key` và không cache:

- `GET /stats`
- `GET /pois?q=&category=&status=all|published|draft&page=1&limit=20`
- `GET /pois/:id`
- `POST /pois`
- `PUT /pois/:id` (bắt buộc `updatedAt` đã đọc)

Ảnh mới gửi trong `image: { contentType, base64 }`; backend kiểm tra kích thước/chữ ký định dạng và ghi POI + ảnh trong cùng transaction. Không gửi `image` thì giữ ảnh hiện có. Slug trùng hoặc dữ liệu bị sửa trước trả 409. Không có chức năng xóa vĩnh viễn.

Kiểm tra: `npm run typecheck`, `npm test`, `npm run build`; kiểm tra SQL bằng `npm run test:integration -w @tourism/poi-service`. Test SQL tạo UUID riêng và dọn bản ghi thử sau khi chạy.

## Thông số hoạt động realtime

Dashboard hiện ba ô: Tổng địa điểm, Đang truy cập và Đang lắng nghe. Hai số hoạt động lấy từ Gateway, cập nhật mỗi 3 giây. User-web gửi heartbeat mỗi 10 giây và gửi ngay khi audio phát/tạm dừng/kết thúc, chuyển tab hoặc đóng trang. Phiên được tính hoạt động khi trang đang hiển thị hoặc vẫn phát audio ở nền. Phiên mất kết nối tự hết hiệu lực sau 45 giây. Một phiên/tab chỉ tính một lượt; đây không phải số người duy nhất được nhận diện.

Chỉ gửi UUID ngẫu nhiên trong bộ nhớ, số thứ tự và trạng thái hoạt động/phát âm thanh. Không gửi GPS, IP, nội dung nghe hay thông tin tài khoản. Gateway giữ bộ đếm trong RAM, reset khi restart; triển khai nhiều Gateway cần bộ đếm dùng chung. Endpoint đọc số liệu `/api/admin/activity` vẫn yêu cầu admin key. Không dùng dữ liệu mẫu hoặc số truy cập tích lũy để thay cho số đang online.

### Tự lấy tọa độ từ địa chỉ
Trong form POI, nhập địa chỉ tại Việt Nam rồi ngừng gõ khoảng 1,2 giây để tự tra cứu, không cần bấm nút hoặc rời ô. Một kết quả sẽ tự điền tọa độ; nhiều kết quả cần chọn vị trí. Nếu lỗi kết nối, vào lại ô địa chỉ rồi rời ô để tự thử lại. Vẫn có thể nhập tọa độ bằng tay. Đổi địa chỉ sẽ xóa tọa độ cũ để tránh lưu nhầm vị trí; chỉ lưu vào SQL khi bấm Lưu thay đổi.

Backend proxy `/api/admin/geocode` yêu cầu quyền admin, cache 24 giờ tối đa 256 địa chỉ, giới hạn một truy vấn đang chạy, một truy vấn chờ và cách nhau ít nhất một giây; các yêu cầu cùng địa chỉ dùng chung kết quả. Có thể đổi dịch vụ qua PHOTON_SEARCH_URL (Photon-compatible). Mặc định dùng Photon demo, hỗ trợ tìm khi ngừng gõ; không tra cứu hàng loạt. Khi nhập số nhà, chỉ nhận kết quả khớp số nhà, không tự thay bằng tâm đường. Chính sách và giới hạn: https://github.com/komoot/photon#demo-server ; khi chạy nhiều instance cần bộ giới hạn/cache dùng chung hoặc dịch vụ riêng. Attribution OpenStreetMap hiển thị ngay trong form.


Khi sửa địa chỉ liên tục trong cùng form, chỉ gửi địa chỉ mới nhất sau khi lượt đang chạy kết thúc; kết quả cũ được bỏ qua. POI mới không dùng tọa độ mẫu: cần tra cứu thành công hoặc nhập tọa độ thủ công trước khi lưu.


### Monitor hệ thống
Mục Monitor hệ thống trên thanh điều hướng mở bảng riêng, cập nhật mỗi 5 giây từ `/api/admin/monitor` và `/api/admin/activity`. Gateway kiểm tra readiness song song của POI, tìm đường và dịch thuật, có timeout, đo độ trễ và uptime gateway. Readiness của POI/dịch thuật thực sự kiểm tra SQL Server; service tìm đường chỉ xác nhận tiến trình, không kiểm tra Valhalla hay quota AI. Số phiên hoạt động và nghe thuyết minh dùng heartbeat thật. Mất kết nối sẽ hiển thị dữ liệu lần cuối kèm cảnh báo, không coi đó là trạng thái hiện tại. Endpoint monitor yêu cầu ADMIN_API_KEY, không trả URL nội bộ hay chi tiết lỗi.
