# GPS trên trình duyệt

## Luồng hoạt động

1. Lần đầu, người dùng bấm Về vị trí của tôi để xin quyền. Với quyền đã được cấp, session tự nối lại `watchPosition`.
2. Trình duyệt xin quyền, rồi cung cấp tọa độ, sai số và thời điểm cập nhật.
3. Tracker kiểm tra dữ liệu trước khi phát snapshot cho React.
4. Leaflet hiển thị marker và vòng sai số; bám theo vị trí nếu người dùng bật chế độ bám.
5. Kéo bản đồ hoặc chọn POI dừng bám bản đồ nhưng vẫn cập nhật marker.
6. GPS dùng một session chung cho cả tab; unmount component/đổi màn hình không hủy watch.
7. `pagehide` (đóng hoặc rời trang) hủy watch; `pageshow` nối lại khi trang được phục hồi từ browser cache.
8. Giao diện chỉ có nút Về vị trí của tôi; GPS chạy đến khi rời/đóng trang hoặc quyền bị thu hồi. Callback từ phiên cũ bị bỏ qua.

Lần đầu chưa cấp quyền: chỉ xin quyền khi người dùng bấm Về vị trí của tôi.
Nếu Permissions API báo `granted`, session tự bắt đầu mà không cần bấm lại.
`sessionStorage` chỉ lưu cờ enabled/disabled để nối lại qua F5, không lưu tọa độ.
Tracker không ghi tọa độ vào log/storage và không tự truyền GPS lên backend.
Khi người dùng bấm tìm đường từ GPS, tọa độ xuất phát được gửi tới Navigation Service rồi Valhalla để tính tuyến.
Tile bản đồ cho vùng đang xem được tải từ OpenStreetMap, kể cả khi bám theo vị trí.

## Lỗi và độ mới

- Từ chối quyền: kết thúc phiên, xóa vị trí và hướng dẫn người dùng tự đổi quyền.
- Timeout hoặc mất tín hiệu: giữ watch để nhận cập nhật tiếp theo; vị trí cũ chuyển xám.
- Quá 30 giây chưa cập nhật: hiển thị vị trí cũ, tạm ngừng bám.
- Không hỗ trợ định vị hoặc context không an toàn: hiển thị lỗi, không đăng ký watch.
- Callback có tọa độ/sai số không hợp lệ bị từ chối; callback cũ hơn fix gần nhất bị bỏ qua.

## Phạm vi hiện tại

GPS ở frontend đã có; `location-service` vẫn là bộ khung.
Chưa có lưu hành trình, chia sẻ GPS giữa thiết bị, WebSocket hay tracking nền.
Trước khi triển khai các phần này cần xác thực, quyền chia sẻ và thời hạn lưu dữ liệu.
Trình duyệt quyết định quyền tạm thời/vĩnh viễn và có thể tạm ngừng GPS khi tab ở nền hoặc thiết bị khóa màn hình.

## Kiểm chứng

`npm test -w @tourism/user-web` dùng Geolocation giả lập, không xin quyền và không lấy vị trí thật của máy chạy test.
Kiểm thử bao gồm khởi động/dừng, watch id 0, callback muộn, retry, lỗi quyền, timeout và dữ liệu lỗi.
Vị trí thật cần người dùng tự cấp quyền trong trình duyệt trên HTTPS hoặc localhost.

Tham khảo: [MDN watchPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition).
