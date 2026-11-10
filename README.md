# Vinlook — Nền tảng Du lịch Đa ngôn ngữ

Monorepo sử dụng npm workspaces, React + Vite + TypeScript và Node.js + Express + SQL Server.

## Đã triển khai

- `apps/user-web`: giao diện bản đồ Leaflet/OpenStreetMap cho du khách, tìm kiếm, lọc danh mục, phân trang, chọn marker, xem chi tiết POI, mở nhanh địa điểm qua mã QR (`/qr/:token`), dịch nội dung sang 16 ngôn ngữ và phát thuyết minh âm thanh.
- `apps/admin-web`: bảng điều khiển dành cho Quản trị viên (Admin) và Nhân viên (Staff):
  - **Tổng quan**: thống kê POI, biểu đồ hoạt động du khách & lượt nghe thuyết minh theo thời gian thực (polling 3 giây).
  - **Địa điểm (POI)**: thêm/sửa/xóa POI có kiểm soát đồng thời (`updated_at`), tải ảnh minh họa, tra cứu tọa độ từ địa chỉ (geocoding) và tạo/tải mã QR định danh.
  - **Tài khoản**: quản lý tài khoản nội bộ (`admin` / `staff`), đổi mật khẩu băm `scrypt`, khóa/mở khóa và thu hồi phiên đăng nhập tức thì.
  - **Giám sát (Monitor)**: trạng thái sức khỏe các microservice, kết nối cơ sở dữ liệu, quy trình CI/CD GitHub Actions và nhật ký sự kiện hệ thống.
- **Định vị GPS trên trình duyệt**: nút **Về vị trí của tôi**, marker vị trí, vòng sai số, bám theo vị trí và phát hiện địa điểm ở gần.
- **Lưu trữ & phục vụ ảnh POI**: nội dung ảnh lưu trong bảng `PoiDb.dbo.poi_images` dạng `VARBINARY(MAX)`; API `/api/pois/:id/image` phục vụ ảnh qua Gateway kèm bộ nhớ đệm ETag (`304 Not Modified`).
- `services/api-gateway` (cổng `4000`): cổng giao tiếp tập trung (API Gateway Pattern), xác thực phiên quản trị bằng cookie `HttpOnly`, phân quyền `admin`/`staff`, theo dõi nhịp đập hoạt động (`/api/activity/heartbeat`), nhật ký sự kiện và chuyển tiếp yêu cầu tới các microservice nội bộ.
- `services/poi-service` (cổng `4001`): quản lý dữ liệu POI công khai & quản trị, ảnh nhị phân, mã QR định danh (`/pois/qr/:token`, `/admin/pois/:id/qr`) và tra cứu tọa độ địa lý trên SQL Server (`PoiDb`).
- `services/navigation-service` (cổng `4002`): tính toán lộ trình đa chặng (ô tô, xe máy, đi bộ) qua tối đa 9 điểm dừng bằng Valhalla và hướng dẫn từng chặng bằng tiếng Việt.
- `services/translation-service` (cổng `4003`): cung cấp danh mục 16 ngôn ngữ, dịch nội dung POI và tổng hợp giọng đọc thuyết minh (WAV) với bộ nhớ đệm trên SQL Server (`TranslationDb`) và hệ thống tệp.
- **Cơ sở dữ liệu & Kiểm thử tự động**: hệ thống migration có theo dõi phiên bản, định danh mã ngắn (`POI001`, `USR001`, `VST001`, `TRN001`, `AUD001`) và quy trình GitHub Actions kiểm tra `typecheck`, `test`, `build` cùng kiểm thử tích hợp SQL Server.

## Chạy local trên PowerShell

Chạy toàn bộ ứng dụng bằng Docker trên máy cá nhân: xem [Docker server và Cloudflare Tunnel](docs/docker-server.md).
Sau khi có `.env`, dùng `npm run server:up`, mở `http://localhost:8080` (User Web) và `http://localhost:8080/admin/` (Admin Web).

Yêu cầu Node.js >= 22.12 (khuyến nghị Node 24), npm và Docker Engine chạy Linux containers.

```powershell
npm ci
Copy-Item .env.example .env # chỉ làm khi chưa có .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

- User Web (Du khách): http://localhost:5173
- Admin Web (Quản trị): http://localhost:5174
- API Gateway: http://localhost:4000/api/pois
- POI Service: http://localhost:4001/pois
- Navigation Service: http://localhost:4002/health/live
- Translation Service: http://localhost:4003/languages
- Kiểm tra Readiness tổng thể: http://localhost:4000/health/ready

Frontend chỉ hiển thị dữ liệu API thật, không tự thay bằng dữ liệu giả khi database lỗi.
Bản đồ cần mạng để tải tile OpenStreetMap; font có fallback khi Google Fonts không tải được.
Tile công cộng chỉ dùng cho phát triển; chọn nhà cung cấp và kiểm tra chính sách sử dụng trước khi đưa lên production.
Vite proxy `/api` sang API Gateway trong môi trường dev; khi triển khai thực tế cần cấu hình reverse proxy tương ứng.

`.env.example` chứa mật khẩu mẫu cho môi trường local. `.env` không được đưa vào Git.
Tài khoản `sa` chỉ dùng cho bootstrap và phát triển local; môi trường production cần tài khoản cơ sở dữ liệu tách biệt theo từng service.
Mặc định local tin cậy chứng chỉ tự ký. Production dùng chứng chỉ hợp lệ và đặt `SQLSERVER_TRUST_CERTIFICATE=false`.

## Định vị GPS

Mỗi lần mở hoặc tải lại trang, bảng hỏi định vị xuất hiện trước. Bấm **Cho phép định vị** để bắt đầu lấy GPS, hoặc **Để sau** để xem bản đồ và tìm kiếm không dùng vị trí. Có thể bật lại bằng **Về vị trí của tôi**. GPS dùng chung một phiên cho cả tab; đổi giữa Khám phá/Lộ trình không cần bật lại.
Trang không tự lấy GPS trước lựa chọn ở bảng hỏi, kể cả khi trình duyệt đã cho quyền. Sau khi đồng ý, GPS có thể nối lại khi quay về tab. F5 hiện lại bảng hỏi; `sessionStorage` chỉ lưu lựa chọn phiên, không lưu tọa độ.
Đóng tab sẽ kết thúc phiên. Giao diện chỉ có một nút **Về vị trí của tôi**, dùng để xin quyền hoặc đưa bản đồ về vị trí mới nhất.
Geolocation yêu cầu HTTPS hoặc `localhost`. Nhịp cập nhật và sai số phụ thuộc thiết bị, hệ điều hành và tín hiệu GPS.
Chấm xanh là vị trí và vòng xanh là sai số do thiết bị cung cấp. Vị trí quá 30 giây hoặc đang lỗi chuyển màu xám.
Kéo bản đồ hoặc chọn POI sẽ tắt bám vị trí; bấm **Về vị trí của tôi** để bám lại.
Theo dõi GPS không lưu lịch sử tọa độ vào database hoặc `localStorage`. Khi tính tuyến từ GPS, tọa độ xuất phát được gửi tới API chỉ đường.

## Chỉ đường

Chọn POI → **Chỉ đường tới đây**: tự tính tuyến và vẽ lên bản đồ, mặc định ô tô; nếu chưa có GPS sẽ xin quyền và chờ vị trí mới.
Có lựa chọn **Ô tô / Xe máy / Đi bộ** ngay dưới điểm xuất phát; đổi phương tiện hoặc điểm xuất phát tự tính lại. Nút **Tính lại tuyến** dùng để thử lại khi cần.
Valhalla dùng `shortest=true` và `disable_hierarchy_pruning=true` để tối ưu quãng đường ô tô/xe máy qua các POI theo thứ tự đã chọn.
Xe máy dùng costing `motor_scooter`, đi bộ dùng `pedestrian` và tối ưu khoảng cách theo quyền truy cập dành cho người đi bộ. Tuyến đi bộ hiển thị bằng đường nét đứt màu tím, kèm thời gian đi bộ dự kiến.
Có thể chọn một POI làm xuất phát để lập kế hoạch mà không dùng GPS.
Cả ba phương tiện hỗ trợ tối đa 9 điểm dừng, có nút đổi thứ tự. Thay đổi điểm xuất phát hoặc điểm dừng sẽ hủy tuyến cũ và tự tính lại.
Nút **Sắp xếp lộ trình** mở bảng đổi thứ tự bằng kéo thả, chọn vị trí, nút lên/xuống hoặc đảo thứ tự. Bấm **Áp dụng & vẽ đường** để tính và vẽ lại một lần; Hủy giữ nguyên tuyến.
`VALHALLA_BASE_URL` có thể đổi sang Valhalla tự host khi triển khai. Xem [Tài liệu API Định tuyến](docs/api/routes.md).

## Dịch POI & Thuyết minh Đa ngôn ngữ

Chọn ngôn ngữ câu chuyện trong chi tiết POI để dịch từ nội dung gốc sang 15 ngôn ngữ khác (tổng cộng 16 ngôn ngữ) và nghe thuyết minh âm thanh qua API. Bản dịch văn bản và tệp âm thanh thuyết minh được lưu đệm trong SQL Server `TranslationDb` (`dbo.poi_translations`, `dbo.poi_narrations`), tự động làm mới khi nội dung gốc thay đổi. Xem [API và cách chạy dịch vụ dịch](docs/api/translations.md).

## Kiểm tra

```powershell
npm run typecheck
npm test
npm run build
# Yêu cầu database đã migrate và seed:
npm run test:integration -w @tourism/poi-service
npm run test:integration -w @tourism/translation-service
npm run test:integration -w @tourism/api-gateway
```

`npm test` chạy kiểm thử đơn vị trên toàn bộ 6 workspace (`user-web`, `admin-web`, `api-gateway`, `poi-service`, `navigation-service`, `translation-service`).
`test:integration` kiểm tra truy vấn SQL Server thật, phân quyền tài khoản, mã QR, tìm kiếm Unicode và bộ nhớ đệm dịch thuật.

## Cơ sở dữ liệu & Quy ước mã nguồn

- Mỗi service sở hữu cơ sở dữ liệu riêng (`PoiDb` và `TranslationDb`); xem [Quyền sở hữu Database](docs/database/ownership.md), [Sơ đồ ERD Vinlook](docs/erd.md) và [API POI](docs/api/pois.md).
- Quy ước đặt tên mã nguồn và cơ sở dữ liệu: xem [Quy ước đặt tên (Naming Conventions)](docs/naming-conventions.md).
- `npm run db:down` dừng SQL Server và giữ lại volume dữ liệu.
