# Quy tắc đặt tên snake_case

Biến, tham số, hàm nội bộ, phương thức của dự án, thuộc tính dữ liệu và trường JSON API dùng snake_case, ví dụ `current_user_id`, `create_app`, `source_language`, `image_url`, `updated_at`.

SQL Server vẫn có hai database PoiDb và TranslationDb, với đúng 9 bảng:

- PoiDb: `users`, `admin_sessions`, `pois`, `poi_images`, `visit_sessions`, `usage_events`, `system_logs`.
- TranslationDb: `poi_translations`, `poi_narrations`.

Cả 74 cột đều dùng snake_case: `password_hash`, `user_id`, `created_at`, `poi_id`, `language_code`, `content_hash`…

Tên do nền tảng quy định được giữ nguyên: React `useState`, JSX/HTML `className`, `onChange`; Node.js `readFile`, `createHash`; trình duyệt `watchPosition`, `getItem`; tùy chọn MSSQL, Leaflet, Vite; trường yêu cầu/phản hồi của Google/Gemini/Azure. Tên component React và kiểu TypeScript giữ PascalCase. Biến môi trường tiếp tục UPPER_SNAKE_CASE. Không sửa nội dung node_modules.

API của dự án trả/nhận snake_case đồng bộ với hai frontend; bên tích hợp API cũ phải cập nhật các tên trường tương ứng.

Migration `009_snake_case.sql` (POI) và `004_snake_case.sql` (translation) đổi tên trên dữ liệu hiện có, giữ nguyên khóa, ảnh, audio, mã băm và ID. CHECK constraints được tạo lại và kiểm tra trong cùng transaction. Migration vẫn được theo dõi bằng extended properties, không thêm bảng kỹ thuật.

Bản sao lưu trước khi đổi tên nằm ở `.local-backups/erd-1793281925893/` và được Git bỏ qua.
