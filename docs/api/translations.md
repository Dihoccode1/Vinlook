# Dịch tự động nội dung POI

Mỗi POI chỉ lưu một tên, mô tả và `source_language` gốc trong PoiDb. Translation service lấy nội dung gốc qua POI API; client chỉ gửi ID và ngôn ngữ đích, không gửi nội dung tùy ý.

- `GET /api/languages`: danh sách 16 ngôn ngữ (tiếng Việt và 15 ngôn ngữ khác).
- `POST /api/pois/:id/translation`, JSON `{ "language": "en" }`: dịch tên và mô tả. `data` chứa nội dung, provider, source_hash và translated_at; `from_cache` cho biết kết quả đã lưu, `original` cho biết trả nguyên bản.
- Chọn ngôn ngữ nguồn trả nguyên bản, không gọi API dịch.

Cache nằm ở **TranslationDb.dbo.poi_translations**, khóa `(poi_id, language_code)`. SHA-256 của ngôn ngữ nguồn, tên và mô tả giúp phát hiện nội dung thay đổi. Cache cũ được thay thế khi có yêu cầu dịch tiếp theo. Các yêu cầu trùng đang chạy trong cùng process dùng chung một lần dịch. Không lưu kết quả lỗi; lỗi hạn mức trả 429, timeout 504 và lỗi provider 502. Giao diện giữ bản gốc và thông báo khi chưa có bản dịch.

provider cấu hình bằng TRANSLATION_PROVIDER: gemini dùng GEMINI_API_KEY và GEMINI_TRANSLATION_MODEL, google dùng Google Cloud Translation Basic v2 với GOOGLE_TRANSLATE_API_KEY. Cấu hình local hiện dùng Gemini cho cả dịch và TTS. Với lựa chọn google: Backend gọi `POST https://translation.googleapis.com/language/translate/v2` với `format: text`; API key chỉ nằm ở backend. Bản cache của provider cũ không được dùng lại khi đổi provider. Không tự chuyển về MyMemory khi lỗi hoặc thiếu key.

Cấu hình Google Cloud:
1. Tạo/chọn project Google Cloud, bật billing và Cloud Translation API theo yêu cầu của Google.
2. Tạo API key, giới hạn key cho Cloud Translation API và IP máy chủ nếu có IP cố định.
3. Đặt `GOOGLE_TRANSLATE_API_KEY=...` trong `.env` local (không commit và không dùng biến `VITE_`). Khởi động lại translation service sau khi đổi key.
4. Chọn ngôn ngữ tại chi tiết POI để thử. Thiếu key trả `503 PROVIDER_NOT_CONFIGURED`; vượt quota trả 429. Không cần key cho việc đọc bản gốc.

Tham khảo [API chính thức](https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate). Các test dùng response giả; cần key hợp lệ để kiểm tra Google API thật. Cache vẫn lưu theo nội dung nguồn và ngôn ngữ; chỉ tái sử dụng khi provider khớp.
Khởi chạy: `npm run db:migrate` tạo PoiDb và TranslationDb, sau đó `npm run dev` chạy thêm service dịch cổng 4003. Có thể cấu hình `TRANSLATION_DATABASE`, `TRANSLATION_PORT`, `TRANSLATION_SERVICE_URL`, `TRANSLATION_SQLSERVER_USER` và `TRANSLATION_SQLSERVER_PASSWORD`. SQL user riêng cần quyền đọc/ghi cache; tài khoản migration cần quyền tạo database/schema.

Kiểm tra SQL: `npm run test:integration -w @tourism/translation-service`. Unit test dùng provider giả để không tiêu quota; test tích hợp SQL xóa các bản ghi thử theo UUID sau khi chạy.



## Dùng nhiều API dịch

`TRANSLATION_PROVIDERS=gemini,mymemory` ưu tiên hơn cấu hình provider đơn. Pool chia vòng tròn các yêu cầu; tên và mô tả được dịch song song. Khi một API lỗi/timeout/thiếu key/hết quota, thử provider còn lại; quota cooldown 60 giây, lỗi khác 10 giây. Cả hai lỗi thì trả lỗi, không lưu bản dịch giả. Cooldown chỉ trong process, không tăng hạn mức bên cung cấp.

Cache hợp lệ do một provider trong pool tạo trước đó được dùng lại. Bản dịch mới qua pool ghi provider là Multi-provider translation vì tên và mô tả có thể do hai API khác nhau tạo. MyMemory miễn phí 5.000 ký tự/ngày, giới hạn 500 byte/request; provider tự tách đoạn. Không dùng email người dùng để tăng quota. Có thể thay mymemory bằng google sau khi cấu hình GOOGLE_TRANSLATE_API_KEY. TTS vẫn do Gemini tạo và lưu riêng.
