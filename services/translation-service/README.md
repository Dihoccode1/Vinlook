# translation-service

Node.js + Express + TypeScript + SQL Server (`TranslationDb`).

## Chức năng chính

- Cung cấp danh mục 16 ngôn ngữ hỗ trợ chính thức (`GET /languages`).
- Dịch tự động tiêu đề và mô tả điểm tham quan (`POST /pois/:id/translation`) với bộ điều phối đa nhà cung cấp (Google Gemini, Google Translate, MyMemory) và bộ nhớ đệm theo mã băm nội dung gốc (`source_hash`) trong bảng `dbo.poi_translations`.
- Tổng hợp giọng đọc thuyết minh đa ngôn ngữ định dạng WAV (`POST /pois/:id/narration`) qua chuỗi nhà cung cấp TTS (Gemini Audio, Azure Speech, Google Cloud TTS), lưu đệm trong bảng `dbo.poi_narrations` và thư mục `storage/narrations`.
- Kiểm tra sức khỏe dịch vụ (`GET /health/live`, `GET /health/ready`).

## Chạy và kiểm thử

- Chạy từ thư mục gốc monorepo: `npm run dev` (cổng mặc định `4003`).
- Khởi tạo/di trú cơ sở dữ liệu: `npm run db:migrate -w @tourism/translation-service`.
- Kiểm thử đơn vị: `npm test -w @tourism/translation-service`.
- Kiểm thử tích hợp SQL Server: `npm run test:integration -w @tourism/translation-service`.
- Xem chi tiết tại `docs/api/translations.md`.
