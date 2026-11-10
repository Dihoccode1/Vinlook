# navigation-service

Node.js + Express + TypeScript (cổng mặc định `4002`).

## Chức năng chính

- Tính toán lộ trình di chuyển qua 2–10 tọa độ bằng Valhalla (`POST /routes`) cho 3 phương tiện:
  - Ô tô (`driving`)
  - Xe máy (`motor_scooter`)
  - Đi bộ (`pedestrian`)
- Hỗ trợ giữ nguyên thứ tự điểm dừng hoặc tối ưu thứ tự tự động, giải mã hình học đường đi (`LineString`) và chuẩn hóa hướng dẫn từng chặng bằng tiếng Việt.
- Kiểm tra sức khỏe dịch vụ: `GET /health/live` và `GET /health/ready`.
- Xem chi tiết tại `docs/api/routes.md` và `README.md` ở thư mục gốc. Service không sử dụng cơ sở dữ liệu riêng.
