# user-web

React 19 + Vite + TypeScript + Leaflet (cổng mặc định `5173`).

## Chức năng chính

- Giao diện bản đồ tương tác OpenStreetMap cho du khách: tìm kiếm từ khóa, lọc danh mục, sắp xếp theo khoảng cách GPS và xem chi tiết địa điểm (POI).
- Hỗ trợ mở trực tiếp điểm tham quan khi quét mã QR công khai (`/qr/:token`).
- Định vị GPS trực tiếp trên trình duyệt, phát hiện địa điểm ở gần và lập lộ trình đa chặng (ô tô, xe máy, đi bộ) qua tối đa 9 điểm dừng.
- Dịch nội dung câu chuyện địa điểm sang 16 ngôn ngữ và phát thuyết minh âm thanh.
- Gửi tín hiệu nhịp đập ẩn danh (`/api/activity/heartbeat`) để thống kê số lượng du khách và lượt nghe thuyết minh theo thời gian thực.

Chạy `npm run dev` từ thư mục gốc để khởi động đồng thời `user-web`, `admin-web` và 4 dịch vụ backend.
