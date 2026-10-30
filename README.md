# Vinlook — nền tảng du lịch đa ngôn ngữ

Monorepo dùng npm workspaces, React + Vite + TypeScript và Node.js + Express + SQL Server.

## Đã triển khai

- `apps/user-web`: bản đồ Leaflet/OpenStreetMap, tìm kiếm, lọc danh mục, phân trang, chọn marker và xem chi tiết POI.
- GPS trên trình duyệt: nút Về vị trí của tôi, marker vị trí, vòng sai số, bám theo vị trí và nhận biết vị trí cũ.
- POI có marker ảnh thu nhỏ, ảnh trong danh sách và thẻ chi tiết; fallback khi thiếu/lỗi ảnh. Ảnh mẫu có nguồn và giấy phép trong `apps/user-web/public/images/pois/ATTRIBUTION.md`.
- Nội dung ảnh lưu trong bảng `PoiDb.dbo.poi_images` dạng `VARBINARY(MAX)`; API `/api/pois/:id/image` phục vụ ảnh qua Gateway với ETag/cache. Không cần giữ ảnh trong thư mục frontend để hiển thị.
- `services/poi-service`: API đọc POI từ SQL Server, validation, truy vấn có tham số, health/readiness.
- `services/api-gateway`: chuyển tiếp API POI và kiểm tra readiness của upstream.
- `services/navigation-service`: tính tuyến ô tô bằng Valhalla, đi qua tối đa 9 POI và hướng dẫn từng chặng bằng tiếng Việt.
- Tab Lộ trình: chọn GPS hoặc POI làm xuất phát, thêm/xóa/đổi thứ tự điểm dừng và vẽ tuyến trên bản đồ.
- Migration có bảng theo dõi phiên bản; seed 3 POI mẫu có thể chạy lại.
- GitHub Actions: typecheck, test, build và kiểm thử tích hợp SQL Server.

Admin, monitor, dịch và các service khác hiện còn là bộ khung. GPS hiện chạy trên trình duyệt; chưa có chia sẻ vị trí qua backend. CI đã có cấu hình; CD chưa triển khai.

## Chạy local trên PowerShell

Chạy toàn bộ ứng dụng bằng Docker trên máy cá nhân: xem [Docker server và Cloudflare Tunnel](docs/docker-server.md).
Sau khi có `.env`, dùng `npm run server:up`, mở `http://localhost:8080` và `http://localhost:8080/admin/`.

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
- Navigation Service: http://localhost:4002/health/live
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

## Định vị GPS

Bấm **Về vị trí của tôi** lần đầu và cấp quyền. GPS dùng chung một phiên cho cả tab; đổi giữa Khám phá/Lộ trình không cần bật lại.
Nếu trình duyệt đã cho quyền, GPS tự nối lại; F5 giữ cờ phiên trong sessionStorage, không lưu tọa độ.
Đóng tab sẽ kết thúc phiên. Giao diện chỉ có một nút Về vị trí của tôi, dùng để xin quyền hoặc đưa bản đồ về vị trí mới nhất.
Việc ghi nhớ quyền và chạy GPS khi tab ở nền phụ thuộc trình duyệt/hệ điều hành; ứng dụng không thể buộc trình duyệt giữ quyền vĩnh viễn.
Geolocation yêu cầu HTTPS hoặc localhost. Nhịp cập nhật và sai số phụ thuộc thiết bị, hệ điều hành và tín hiệu GPS.
Chấm xanh là vị trí và vòng xanh là sai số do thiết bị cung cấp. Vị trí quá 30 giây hoặc đang lỗi chuyển màu xám.
Kéo bản đồ hoặc chọn POI sẽ tắt bám vị trí; bấm **Về vị trí của tôi** để bám lại.
Theo dõi GPS không lưu lịch sử tọa độ vào database hoặc localStorage. Khi tính tuyến từ GPS, tọa độ xuất phát được gửi tới API chỉ đường.
Khi bản đồ di chuyển đến vị trí, trình duyệt tải tile từ OpenStreetMap cho khu vực đang xem.
Theo dõi hoạt động khi trang đang mở; chưa hỗ trợ theo dõi nền khi khóa màn hình.

## Chỉ đường

Chọn POI → **Chỉ đường tới đây**: tự tính tuyến và vẽ lên bản đồ, mặc định ô tô; nếu chưa có GPS sẽ xin quyền và chờ vị trí mới.
Có lựa chọn **Ô tô / Xe máy / Đi bộ** ngay dưới điểm xuất phát; đổi phương tiện hoặc điểm xuất phát tự tính lại. Nút Tính lại tuyến dùng để thử lại khi cần.
Valhalla dùng `shortest=true` và `disable_hierarchy_pruning=true` để tối ưu quãng đường ô tô/xe máy qua các POI theo thứ tự đã chọn.
Xe máy dùng costing `motor_scooter`, đi bộ dùng `pedestrian` và tối ưu khoảng cách theo quyền truy cập dành cho người đi bộ. Tuyến đi bộ hiển thị bằng đường nét đứt màu tím, kèm thời gian đi bộ dự kiến.
Có thể chọn một POI làm xuất phát để lập kế hoạch mà không dùng GPS.
Cả ba phương tiện hỗ trợ tối đa 9 điểm dừng, có nút đổi thứ tự. Thay đổi điểm xuất phát hoặc điểm dừng sẽ hủy tuyến cũ và tự tính lại.
Nút **Sắp xếp lộ trình** mở bảng đổi thứ tự bằng kéo thả, chọn vị trí, nút lên/xuống hoặc đảo thứ tự. Bấm **Áp dụng & vẽ đường** để tính và vẽ lại một lần; Hủy giữ nguyên tuyến. Điểm xuất phát và phương tiện được giữ nguyên.
Sau khi áp dụng, bản đồ vẽ lần lượt **A → 1 → 2…**, từng chặng theo hình dạng đường từ API, có màu và mũi tên riêng cùng số trên ảnh POI. Nút **Vẽ đường theo lộ trình** cho phép yêu cầu vẽ lại toàn bộ tuyến.
Khi các chặng trùng đường, màu và mũi tên của chặng đi trước được ưu tiên nằm trên: chặng 1 → chặng 2 → chặng 3…
Thời gian là ước tính, chưa tính giao thông trực tiếp; tuyến không tự cập nhật khi di chuyển.
Khi chọn GPS, cần fix mới trong vòng 30 giây. Khi phiên GPS kết thúc, tuyến dùng GPS làm xuất phát được xóa.
Tọa độ được gửi tới Valhalla khi yêu cầu chỉ đường hoặc thay đổi lộ trình/phương tiện; không lưu hành trình ở backend. GPS cập nhật thường xuyên không tự tạo thêm request tính tuyến.
`VALHALLA_BASE_URL` có thể đổi sang Valhalla tự host khi triển khai. Xem `docs/api/routes.md`.

## Kiểm tra

```powershell
npm run typecheck
npm test
npm run build
# Yêu cầu database đã migrate và seed:
npm run test:integration -w @tourism/poi-service
```

`npm test` kiểm tra API với repository giả lập, gồm lỗi upstream/database, và vòng đời GPS bằng Geolocation giả lập.
`test:integration` kiểm tra truy vấn SQL thật, Unicode, tìm kiếm, phân trang và ký tự đặc biệt.
CI chạy migration và seed hai lần để kiểm tra khả năng chạy lại trên database test riêng.

## Database

Mỗi service sở hữu database riêng; không query database service khác.
Hiện đã triển khai `PoiDb`; xem `docs/database/ownership.md` và `docs/api/pois.md`.
Các file trong `services/poi-service/database/seeds/images/` chỉ dùng để nạp ảnh mẫu vào database; cần chạy lại migrate và seed khi cập nhật tính năng ảnh.
Dữ liệu seed là dữ liệu phát triển; cần duyệt nội dung và tọa độ trước khi xuất bản thực tế.
`npm run db:down` dừng SQL Server và giữ volume dữ liệu.

## Tài liệu tham khảo

- SQL Server container: https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker?view=sql-server-ver16
- Leaflet: https://leafletjs.com/examples/quick-start/
- Vite dev proxy: https://vite.dev/config/server-options#server-proxy
- Geolocation watch/clear: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition
# Dịch POI tự động

Chọn ngôn ngữ câu chuyện trong chi tiết POI để dịch từ một nội dung gốc sang 15 ngôn ngữ khác qua API. Cache bản dịch lưu trong SQL Server `TranslationDb`, tự làm mới khi nội dung gốc thay đổi. Xem [API và cách chạy dịch vụ dịch](docs/api/translations.md).


Thiết kế dữ liệu và sơ đồ quan hệ cập nhật: [ERD Vinlook](docs/erd.md).
