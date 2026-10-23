# Vinlook — D-009: gói offline và lưu trữ trên trình duyệt

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-059**. Cơ sở REQ-007–009, DEC-058 và phép đo tại research/offline-data-measurement.md. Chưa có app, package hoàn chỉnh hoặc phép thử điện thoại thật.

## 1. Kiến trúc đề xuất

- Dùng Service Worker để lưu app shell: HTML, JavaScript, CSS, giao diện English, style bản đồ, font/glyph, sprite/icon và phụ thuộc cần để mở lại offline. Không phụ thuộc CDN bên ngoài khi chạy offline.
- Cache Storage giữ app shell theo phiên bản; IndexedDB giữ manifest, trạng thái gói, POI English, ảnh/audio và dữ liệu bản đồ/graph dạng Blob hoặc các chunk. Không dùng localStorage chứa gói lớn. Không cache API nhân viên/JWT/mật khẩu vào gói.
- PMTiles đọc dữ liệu đã lưu qua adapter Source cục bộ, lấy đúng byte range cần thiết; không giả rằng cache HTTP một vài tile là đã tải đủ toàn bộ thành phố. MapLibre chỉ hiển thị; routing cần engine riêng.
- Tính tuyến/tính lại trong Web Worker để tránh chặn giao diện. Khi chưa có graph/engine hợp lệ, không đánh dấu gói hoàn chỉnh. Không thay yêu cầu routing bằng đường thẳng tới POI.

Đây là lựa chọn công nghệ mới cần duyệt; chưa chọn thư viện wrapper IndexedDB, tool Service Worker hoặc thuật toán routing cụ thể.

## 2. Manifest và trạng thái gói đề xuất

Manifest gồm packageVersion, schemaVersion, appCompatibility, coverageVersion, language=en, createdAt, danh sách thành phần (id, URL, byteLength, SHA-256, loại dữ liệu) và danh mục POI. Không đưa vị trí người dùng vào manifest.

Trạng thái: not_downloaded → downloading → verifying → ready; lỗi thành incomplete với lý do và nút Retry. Cập nhật tạo candidate mới, giữ active package cũ. Chỉ đổi con trỏ active sau khi xác minh tất cả thành phần và appCompatibility. Con trỏ và trạng thái active đổi trong transaction IndexedDB; Cache Storage không được giả là cùng transaction với IndexedDB, nên cần marker app-shell-ready và kiểm tra phục hồi khi mở lại.

Đề xuất bổ sung local stores: `packages`, `packageFiles`, `settings` (activePackageVersion). Đây là dữ liệu cục bộ trên trình duyệt, không phải collection Atlas mới. Tải lại kiểm tra các file đã tải đúng checksum, chỉ tải lại phần thiếu/hỏng; chưa hứa resume giữa một file nếu server không hỗ trợ.

Sau chuyển phiên bản thành công và kiểm tra reopen, dọn candidate lỗi không còn dùng và gói cũ theo thao tác cập nhật đã hoàn tất. Không dọn gói cũ trước khi gói mới sẵn sàng; không dùng cleanup local để xóa lịch sử/asset server thuộc kỳ bảo lưu.

## 3. Dung lượng, mất dữ liệu và thông báo

Trước tải, dùng StorageManager.estimate để kiểm tra ước lượng quota/usage, trình tổng byte của manifest và dung lượng tạm dự kiến khi giữ cả gói cũ/mới. Đề xuất thêm dự phòng 20% trên kích thước candidate; đây chỉ là kiểm tra sơ bộ, vẫn phải xử lý QuotaExceededError trong lúc ghi. Không chốt trần MB khi graph và audio chưa đo.

Đề xuất yêu cầu persistent storage khi người dùng chủ động tải gói. Nếu trình duyệt không cấp, vẫn cho tải nếu còn chỗ nhưng báo khả năng dữ liệu bị trình duyệt thu hồi. Người dùng xóa site data hoặc browser evict dữ liệu thì không thể bảo đảm mở lại offline; lần khởi động phát hiện mất thành phần sẽ bỏ nhãn ready và yêu cầu tải lại khi có mạng. Đây là giới hạn nền tảng cần chấp nhận rõ, không phải bỏ yêu cầu hoạt động khi đã có gói đầy đủ.

Trình duyệt có thể không mở được ứng dụng nếu cả app shell đã bị xóa; khi đó không thể dựa vào chính app để báo lỗi offline. Không tuyên bố navigator.storage.persist luôn được cấp hoặc bảo vệ khỏi thao tác xóa dữ liệu của người dùng. [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API).

## 4. Phân phối đề xuất và giới hạn

Đề xuất phân phối file gói theo URL bất biến dưới **cùng origin frontend Vercel**, tải file static trực tiếp, không qua Express/Function. Cách này tránh phụ thuộc CORS từ release-download host và filesystem Render tạm thời. Gói chứa bản sao English/ảnh/audio đã duyệt từ pipeline, không thay Cloudinary làm nơi quản lý asset nguồn.

Vercel Hobby có giới hạn tải lên static/source theo phương thức triển khai; phải đo output và xác minh cách deploy thực trước khi duyệt cấu hình cuối. Không mặc định việc chia file giải quyết mọi giới hạn tổng upload. Nếu tổng artifact vượt giới hạn miễn phí thì dừng phương án phân phối này và trình thay thế; không tự bật trả phí hoặc chuyển host. [Vercel Limits](https://vercel.com/docs/limits).

Đây là hướng phân phối đề xuất có điều kiện, **chưa chứng minh vừa quota**. GitHub Releases có thể chứa artifact tải xuống để lưu bản build, nhưng không tự coi URL tải release là browser-host có CORS/range phù hợp. Nguồn: [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

Nội dung công khai thay đổi không tự thay file packageVersion cũ. Cần build manifest/package mới từ snapshot đã duyệt, kiểm tra rồi phát hành bất biến; du khách chủ động cập nhật theo nghiệp vụ đã chốt. Đồng bộ soft deletion online vẫn phải ẩn POI không chờ tải gói mới; dùng danh sách tombstone/API riêng sẽ đặc tả ở contract.

## 5. Gate kiểm chứng chưa đạt

- Mở mới, tải đủ, đóng tab, ngắt mạng hoàn toàn, mở lại bằng URL; map/search/nearby/English audio/GPS/tuyến và reroute đều chạy không request mạng bắt buộc.
- Lỗi tải giữa chừng, checksum sai, hết quota, update thất bại và reload giữa chuyển phiên bản không làm mất gói active cũ.
- Kiểm tra trên Galaxy A35 Chrome và iPhone 13 Safari, ghi OS/browser và quota thực; desktop giả lập không thay phép thử này.
- Graph phải xét quyền đi bộ, barrier, mạng đường không nối và điểm vào POI; không nối tùy tiện qua sông/biển hoặc gán đường thẳng là tuyến hợp lệ. Phạm vi cả Côn Đảo không có nghĩa luôn có tuyến đi bộ nối đất liền với đảo.

PMTiles đã đo 32,09 MB và đường thô 12,74 MB không phải tổng package/graph cuối. Chưa chọn routing engine; sẽ trình so sánh và phương án kiểm chứng riêng trước khi chốt engine. Việc duyệt D-009 không cho phép bắt đầu code ứng dụng trước gate Design.

## 6. Nội dung cần duyệt

1. Service Worker + Cache Storage/IndexedDB, local stores/manifest/version và cập nhật giữ gói cũ như trên.
2. Hướng phân phối static cùng origin Vercel **có điều kiện kiểm chứng dung lượng**, không xác nhận hosting cuối đã khả thi.
3. Chính sách kiểm tra dung lượng/dự phòng 20%, xin persistent storage và xử lý khi browser xóa/thu hồi dữ liệu.

Routing engine, graph cuối, tổng dung lượng, audio format, API manifest/tombstone và kết quả test vẫn còn mở. Không có lựa chọn nào ở đây giảm phạm vi chức năng offline.

## Kết quả phê duyệt

Duy duyệt D-009 tại DEC-059: kiến trúc lưu gói/cập nhật, hướng phân phối static Vercel có điều kiện kiểm chứng và chính sách storage đã trình. Không xác nhận engine, dung lượng hoặc kiểm thử đã đạt; các gate kiểm chứng giữ nguyên.
