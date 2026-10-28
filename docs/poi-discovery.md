# Khám phá địa điểm quanh GPS

- Danh sách mặc định chỉ hiện POI trong bán kính 5.000 mét tính bằng Haversine (đường chim bay), sắp gần trước.
- Bộ lọc danh mục áp dụng lên danh sách. Khi nhập từ khóa tên/địa chỉ, bỏ giới hạn 5 km; hỗ trợ tìm không dấu và vẫn giữ bộ lọc danh mục đang chọn.
- Chưa có GPS hợp lệ hoặc GPS đã cũ: danh sách gần bạn yêu cầu cập nhật vị trí. Tìm kiếm vẫn hoạt động, không yêu cầu GPS.
- Bản đồ luôn nhận catalog POI đầy đủ, độc lập với từ khóa, danh mục, bán kính và trang danh sách. Chọn một POI ở xa trên bản đồ vẫn mở chi tiết và chỉ đường được.
- Catalog tải qua tất cả các trang API (100 POI/trang), không dừng ở 20 kết quả đầu. Danh sách giao diện phân trang 20 mục sau khi lọc.
- GPS và tìm kiếm được xử lý trong trình duyệt; thay đổi vị trí không gọi lại API catalog, không gửi tọa độ cho API danh sách POI.

Kiểm thử: `explore-pois.test.ts` kiểm tra mốc 5 km, Unicode và tìm ngoài bán kính; `poi-discovery.test.ts` kiểm tra catalog cho map, tải nhiều trang, GPS thay đổi không refetch, hủy phản hồi cũ và phục hồi lỗi.
