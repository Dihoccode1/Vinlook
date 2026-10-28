# Navigation API

Gateway: `POST http://localhost:4000/api/routes`.
Service nội bộ: `POST http://localhost:4002/routes`.

```json
{
  "profile": "driving",
  "optimization": "shortest",
  "waypoints": [
    { "latitude": 10.7725, "longitude": 106.698 },
    { "latitude": 10.777, "longitude": 106.6953 }
  ]
}
```

Điểm đầu là xuất phát, các điểm còn lại là điểm dừng theo thứ tự, tối đa 10 điểm tổng cộng.
`profile`: `driving` (mặc định), `motorcycle`, `walking`. Không tự tối ưu lại thứ tự POI.
`optimization`: `shortest` (mặc định), áp dụng cho cả ba phương tiện.
Mặc định tối ưu theo khoảng cách: gửi Valhalla `costing_options.auto.shortest=true` và `disable_hierarchy_pruning=true`.
Xe máy dùng `motor_scooter` với hai tùy chọn tối ưu khoảng cách tương tự.
Đi bộ dùng `pedestrian` với `shortest=true`; pedestrian không sử dụng hierarchy pruning. Trả quãng đường và thời gian đi bộ do provider tính, hỗ trợ tối đa 9 điểm dừng như các phương tiện khác.
Tôn trọng quyền truy cập đường ô tô và điểm nối vào mạng đường. Với tuyến rất dài, provider có thể áp dụng giới hạn cho việc tắt hierarchy pruning.

Kết quả `{ data: { profile, optimization, provider, distance, duration, geometry, legs } }`.
Quãng đường tính bằng mét; thời gian tính bằng giây; geometry GeoJSON LineString dùng `[longitude, latitude]`.
Mỗi leg có `steps` gồm `instruction` tiếng Việt, `distance`, `duration`, `location`.
Mỗi leg còn có `geometry` GeoJSON LineString của riêng chặng đó, ghép từ geometry các bước đi theo đúng thứ tự. Giao diện dùng để vẽ đủ các chặng xuất phát → POI 1 → POI 2…; không nối các POI bằng đường thẳng thay cho đường giao thông.

## Lỗi

| HTTP | Code | Ý nghĩa |
| --- | --- | --- |
| 400 | INVALID_ROUTE / INVALID_BODY | Tọa độ, số điểm hoặc JSON sai |
| 413 | INVALID_BODY | Request lớn hơn 16 KiB |
| 422 | NO_ROUTE | Không có tuyến hoặc không tìm thấy đường trong bán kính 1 km quanh một điểm |
| 502 | PROVIDER_UNAVAILABLE / INVALID_PROVIDER_RESPONSE | Provider không khả dụng hoặc dữ liệu không hợp lệ |
| 504 | PROVIDER_TIMEOUT | Provider quá thời gian chờ 12 giây |

Không lưu request/response tuyến đường trong database hay application log; response dùng `Cache-Control: no-store`.
Khi người dùng bấm Chỉ đường tới đây hoặc thay đổi phương tiện/lộ trình, tọa độ được gửi tới Valhalla. Nếu chưa có GPS, giao diện tự chờ fix mới trước khi gọi API.

## Cấu hình

`NAVIGATION_PORT=4002`, `NAVIGATION_SERVICE_URL=http://localhost:4002`, `VALHALLA_BASE_URL=https://valhalla1.openstreetmap.de`.
Readiness của Navigation Service chỉ xác nhận ứng dụng được cấu hình và đang chạy; không probe dịch vụ Valhalla.
Gateway readiness hiện kiểm tra POI Service; khi routing lỗi các chức năng POI vẫn sử dụng được.

Provider được cấu hình bởi server, client không được truyền URL provider.
Valhalla công cộng dùng cho bản phát triển; production cần provider/self-host phù hợp chính sách sử dụng và lưu lượng.
Chưa có traffic trực tiếp, reroute tự động theo GPS hay voice navigation.

Tham khảo: [Valhalla Route API](https://valhalla.github.io/valhalla/api/route/api-reference/).
