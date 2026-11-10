# Quyền sở hữu cơ sở dữ liệu (Database Ownership)

Hệ thống Vinlook sử dụng kiến trúc **Database-per-Service** trên SQL Server với 2 cơ sở dữ liệu vật lý tách biệt:

| Cơ sở dữ liệu | Dịch vụ sở hữu & sử dụng | Các bảng dữ liệu (`dbo.*`) |
| --- | --- | --- |
| `PoiDb` | `poi-service` (quản lý POI, ảnh, mã QR) & `api-gateway` (phiên đăng nhập, tài khoản nội bộ, nhật ký hệ thống) | `pois`, `poi_images`, `poi_qr_codes`, `users`, `admin_sessions`, `visit_sessions`, `usage_events`, `system_logs` |
| `TranslationDb` | `translation-service` (lưu đệm bản dịch văn bản và âm thanh thuyết minh) | `poi_translations`, `poi_narrations` |

> `navigation-service` là dịch vụ không trạng thái (stateless), tính toán lộ trình trực tiếp qua Valhalla và không sử dụng cơ sở dữ liệu riêng.

## Nguyên tắc vận hành

1. Không truy vấn chéo trực tiếp (cross-database JOIN) giữa `PoiDb` và `TranslationDb` trong runtime của ứng dụng; `translation-service` đọc nội dung gốc của POI thông qua HTTP API của `poi-service`.
2. Toàn bộ tên bảng và cột tuân thủ nghiêm ngặt quy tắc `snake_case` và định danh mã ngắn (`POI001`, `USR001`, `VST001`, `TRN001`, `AUD001`). Xem chi tiết tại [Sơ đồ ERD Vinlook](../erd.md) và [Quy ước đặt tên](../naming-conventions.md).
