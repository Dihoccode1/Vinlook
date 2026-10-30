# ERD Vinlook

Thiết kế dựa trên sơ đồ người dùng cung cấp, đã áp dụng bằng migration lên SQL Server local.
Giữ nguyên UUID của POI, nội dung, ảnh, các bản dịch và audio hiện có.

## Sơ đồ quan hệ

Tên trong sơ đồ là tên bảng thực tế. Đường liền biểu diễn khóa ngoại SQL;
đường chấm giữa POI và bản dịch/audio là quan hệ logic qua service, do đang ở hai database.

```mermaid
erDiagram
    users ||--o{ pois : "tạo - created_by"
    users ||--o{ pois : "sửa - updated_by"
    users ||--o{ admin_sessions : "đăng nhập"
    users o|--o{ system_logs : "thực hiện"
    pois ||--o| poi_qr_codes : "mã QR"
    pois ||--o| poi_images : "ảnh minh họa"
    pois ||..o{ poi_translations : "bản dịch - liên kết logic"
    pois ||..o{ poi_narrations : "audio - liên kết logic"
    visit_sessions ||--o{ usage_events : "phát sinh"
    pois o|--o{ usage_events : "tương tác"
    pois o|--o{ system_logs : "được chỉnh sửa"

    users {
        uniqueidentifier id PK
        nvarchar username UK
        varchar password_hash
        nvarchar full_name
        varchar role
        varchar status
        datetime2 created_at
    }
    admin_sessions {
        char token_hash PK
        uniqueidentifier user_id FK
        datetime2 created_at
        datetime2 expires_at
        datetime2 revoked_at "nullable"
    }
    pois {
        uniqueidentifier id PK
        uniqueidentifier created_by FK "nullable với dữ liệu cũ"
        uniqueidentifier updated_by FK "nullable"
        nvarchar slug UK
        nvarchar name
        nvarchar address
        float latitude
        float longitude
        nvarchar category
        nvarchar visitor_description "giới thiệu cho khách"
        nvarchar description "bài thuyết minh gốc"
        varchar source_language
        bit is_published
        nvarchar image_url
        nvarchar image_credit
        nvarchar image_source_url
        nvarchar image_license_url
        datetime2 created_at
        datetime2 updated_at
    }
    poi_images {
        uniqueidentifier poi_id PK,FK
        varbinary content
        varchar content_type
        char sha256
        datetime2 updated_at
    }
    poi_translations {
        uniqueidentifier id UK
        uniqueidentifier poi_id PK "liên kết POI qua service"
        varchar language_code PK
        varchar source_language
        char source_hash
        nvarchar name
        nvarchar description
        nvarchar provider
        varchar status
        datetime2 translated_at
    }
    poi_narrations {
        uniqueidentifier id UK
        uniqueidentifier poi_id PK "liên kết POI qua service"
        varchar language_code PK
        char content_hash
        varbinary audio
        nvarchar file_path "nullable"
        float duration_seconds "nullable"
        varchar status
        datetime2 created_at
    }
    visit_sessions {
        uniqueidentifier id PK
        datetime2 started_at
        datetime2 last_seen_at
        datetime2 ended_at "nullable"
        varchar preferred_language "nullable"
    }
    usage_events {
        bigint id PK
        uniqueidentifier session_id FK
        uniqueidentifier poi_id FK "nullable"
        varchar event_type
        varchar language_code "nullable"
        datetime2 occurred_at
    }
    system_logs {
        bigint id PK
        uniqueidentifier user_id FK "nullable"
        uniqueidentifier poi_id FK "nullable"
        nvarchar component
        varchar level
        varchar action "nullable"
        nvarchar message
        datetime2 occurred_at
    }
```

## Đối chiếu với ERD gốc

| Tên nghiệp vụ | Bảng SQL | Database |
|---|---|---|
| NGUOI_DUNG | users | PoiDb |
| POI | pois | PoiDb |
| ẢNH_POI (bổ sung) | poi_images | PoiDb |
| BAN_DICH | poi_translations | TranslationDb |
| AUDIO | poi_narrations | TranslationDb |
| PHIÊN_TRUY_CẬP (bổ sung) | visit_sessions | PoiDb |
| PHIÊN_ĐĂNG_NHẬP (bổ sung) | admin_sessions | PoiDb |
| SU_KIEN_SU_DUNG | usage_events | PoiDb |
| NHAT_KY_HE_THONG | system_logs | PoiDb |

Tổng cộng đúng 10 bảng vật lý. Routes, RouteStops và cả hai SchemaMigrations đã được xóa; lịch sử migration nằm trong database extended properties.
Dữ liệu POI, ảnh, bản dịch, audio và tài khoản được giữ nguyên; vẫn dùng hai database.

## Các điều chỉnh so với ảnh

- Dùng `UNIQUEIDENTIFIER` cho tài khoản, POI và phiên để giữ tương thích dữ liệu hiện tại. Sự kiện và log dùng `BIGINT IDENTITY`.
- SQL Server dùng `NVARCHAR` cho tiếng Việt và `NVARCHAR(MAX)` cho văn bản dài; không dùng kiểu `string`/`text` của sơ đồ khái niệm.
- Tách phiên khách khỏi phiên đăng nhập admin; khách không phải có tài khoản mới dùng bản đồ.
- Một POI tối đa một ảnh nhị phân, một bản dịch và một audio hiện hành cho mỗi ngôn ngữ.
- Giữ khóa chính `(poi_id, language_code)` của bản dịch/audio, thêm `id` duy nhất tương ứng ERD; không tái tạo/xóa cache.
- audio nhị phân vẫn là dữ liệu được lưu trong DB. `file_path`/`duration_seconds` là metadata tùy chọn, chưa backfill cho audio cũ.
- POI cũ không tự gán người tạo để tránh nhận nhầm lịch sử. Các lần tạo/sửa qua dashboard sau migration được gắn tài khoản đã đăng nhập và có log trong cùng transaction.
- Nhật ký có thể không có người dùng hoặc POI khi ghi lỗi hệ thống.

## Trạng thái hợp lệ

| Bảng | Giá trị |
|---|---|
| users.role | admin, staff |
| users.status | active, disabled |
| pois.is_published | 0: bản nháp; 1: xuất bản |
| usage_events.event_type | poi_view, audio_start, audio_pause, audio_end, route_created |
| system_logs.level | info, warning, error |
| poi_translations/poi_narrations.status | ready, draft, failed |

## Phần đã nối vào ứng dụng

- POI, ảnh, giới thiệu, bản dịch và audio tiếp tục đọc/ghi qua các repository hiện có.
- Đăng nhập đọc `users` trong DB, kiểm tra trạng thái và vai trò. Chỉ lưu hash scrypt của mật khẩu.
- Phiên đăng nhập lưu hash token trong `admin_sessions`, có hạn 8 giờ, thu hồi khi đăng xuất. Khóa tài khoản có hiệu lực ngay trên các yêu cầu tiếp theo.
- Nhật ký đăng nhập/đăng xuất và tạo/sửa POI đã lưu vào `system_logs`.
- `visit_sessions`, `usage_events` đã có cấu trúc và khóa ngoại; chưa nối luồng tự ghi từ bản đồ vào các bảng này. Dashboard trực tiếp vẫn dùng heartbeat RAM, không suy diễn các bản ghi lịch sử chưa có.

## Migration

```bash
npm run db:migrate
```

- `006_erd_management.sql`: nền tảng quản lý; `007_staff_role.sql`: quyền Admin/Staff; `008_remove_route_storage.sql`: bỏ hai bảng lộ trình.
- `database/migration-history.sql`: chuyển lịch sử từ bảng cũ sang extended properties và bỏ bảng kỹ thuật.
- `003_erd_content_metadata.sql`: metadata ERD của bản dịch/audio.
- Sau migrate, seed admin từ `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` **chỉ nếu chưa có**. Không reset mật khẩu của tài khoản đã có. Tài khoản local hiện tại vẫn là tài khoản người dùng đã yêu cầu.

## Xem trong SSMS

Refresh `Databases → PoiDb → Tables` và `TranslationDb → Tables`.

```sql
SELECT id, username, full_name, role, status FROM PoiDb.dbo.users;
SELECT TOP (50) user_id, poi_id, component, level, action, message, occurred_at
FROM PoiDb.dbo.system_logs ORDER BY occurred_at DESC;
SELECT name FROM PoiDb.sys.tables WHERE is_ms_shipped=0;
SELECT name FROM TranslationDb.sys.tables WHERE is_ms_shipped=0;
```

Không đưa `password_hash` hoặc `token_hash` vào API dashboard công khai.

## Mã QR địa điểm

Bảng `PoiDb.dbo.poi_qr_codes`: `poi_id` (PK, FK → pois.id), `qr_token` (UNIQUE, bắt buộc, tối đa 128 ký tự, phân biệt hoa/thường), `qr_image_url` (nullable, tối đa 2048 ký tự), `created_at`, `updated_at` (UTC). Mỗi POI có tối đa một QR. Hai thời điểm mặc định là lúc tạo; trigger tự cập nhật `updated_at` khi sửa. Không tự tạo mã hoặc ảnh QR khi chạy migration.

ID thực thể hiện dùng mã ngắn có tiền tố (`POI001`, `USR001`, `VST001`, `TRN001`, `AUD001`). Các khóa ngoại dùng mã tương ứng. Xem [quy tắc ID và nâng cấp](short-ids.md).
