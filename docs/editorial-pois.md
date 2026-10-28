# Bộ nội dung POI do Codex soạn

Lệnh `npm run content:import-editorial -w @tourism/translation-service` nhập thêm 17 POI tại TP.HCM để bổ sung cho ba POI mẫu ban đầu. Văn bản được viết và dịch trực tiếp trong phiên Codex, không gọi một API Codex riêng, không tiêu hạn mức Gemini/MyMemory khi nhập.

Nguồn dữ liệu trong `src/content/saigon-pois.ts` và `src/content/editorial-locales.ts`. Mỗi POI mới có một mô tả tiếng Việt và 15 bản dịch: en, fr, de, es, it, pt, ru, ja, ko, zh-CN, th, id, ms, ar, hi. Tên riêng và địa chỉ giữ tiếng Việt để đối chiếu bản đồ. Bài hướng dẫn dùng bố cục chung theo nhóm chợ, bảo tàng và không gian kiến trúc; đây là bản nháp hướng dẫn trải nghiệm, chưa phải bài khảo cứu lịch sử riêng cho từng địa điểm. Thời lượng đọc thực tế phụ thuộc giọng TTS.

POI ghi vào PoiDb.dbo.Pois. Bản dịch ghi vào TranslationDb.dbo.PoiTranslations, Provider = Codex editorial và source hash của nội dung gốc. API dùng bản biên soạn này khi hash khớp mà không gọi lại provider. Nội dung nguồn bị sửa sẽ làm bản dịch cũ không còn hợp lệ như các bản dịch khác.

Importer không ghi đè POI hay bản dịch đã có. Nếu trùng slug/ID nhưng nội dung đã khác, importer giữ nguyên dữ liệu và báo tên POI. Chạy lại an toàn: không sinh thêm bản ghi. Ba POI gốc, ảnh và audio hiện có được giữ nguyên. Bộ văn bản này không tự tạo audio. Ảnh cho 17 POI mới đã được bổ sung bằng scripts/poi-photos.mjs và lưu SQL. Có thể chạy content:prepare sau đó nếu cần tạo giọng bằng Gemini.

Địa điểm và địa chỉ đối chiếu từ [Vietnam Tourism](https://vietnam.travel/things-to-do/7-must-see-attractions-hcmc/), [danh sách địa điểm du lịch TP.HCM](https://visithcmc.net/en/page/ke-hoach-chuyen-di), [giới thiệu di sản thành phố](https://visithcmc.net/en/news/sac-mau-di-san-thanh-pho-ho-chi-minh) và [Chùa Ngọc Hoàng](https://visithcmc.net/en/news/chua-ngoc-hoang-chua-cau-con-cau-duyen-o-tphcm). Tọa độ là pin đại diện để thử bản đồ, chưa xác minh từng cổng vào; không lưu giờ mở cửa hoặc giá vé chưa kiểm chứng.


## Ảnh lưu SQL Server

Các ảnh bổ sung nằm trong services/poi-service/database/seeds/images, với manifest additional-photos.json và tác giả/giấy phép trong ADDITIONAL_ATTRIBUTION.md. Chạy `node --env-file=.env scripts/poi-photos.mjs import` để nhập lại từ bản local, không cần tải mạng. Lệnh không ghi đè ảnh đã có. Chạy mode `verify` để kiểm tra ảnh JPEG, attribution, SHA-256 ETag và phản hồi 304 qua Gateway.

Mode `prepare` tải bộ ảnh được chọn cụ thể từ Wikimedia Commons; metadata giấy phép được truy vấn cùng lúc để giảm số request. Cần kiểm tra trực quan khi đổi danh sách ảnh. Ảnh mang tính minh họa lịch sử: Nguyễn Văn Bình là góc nhìn từ con đường về phía Nhà thờ Đức Bà; Bạch Đằng là cảnh ven sông. Ảnh gốc và giấy phép được giữ, giao diện cắt khung bằng CSS khi hiển thị.

## Hoàn tất 15 bản dịch cho cả 20 POI

`npm run content:complete-translations -w @tourism/translation-service` nhập 7 bản còn thiếu của Chợ Bến Thành và 13 bản của Dinh Độc Lập. Các bản này dịch đầy đủ năm đoạn của bài gốc đang dùng, không thay tiếng Việt. Script kiểm tra hash của cả hai bài trước khi ghi, giữ nguyên bản dịch hợp lệ đã có và kiểm tra coverage theo hash của toàn bộ POI đã xuất bản. Kết quả đã xác nhận: 20 POI, 300 bản dịch hợp lệ, không thiếu ngôn ngữ nào. Tiếng Việt gốc không tính trong 300 bản dịch.

Các bản bổ sung mang Provider Codex editorial và được API trả trực tiếp từ SQL. Chạy lại không ghi thêm hoặc ghi đè bản hợp lệ. Nếu bài gốc bị chỉnh sửa, cần cập nhật nội dung dịch và hash sau khi biên tập, không tự gắn bản dịch cũ vào nội dung mới. Việc nhập văn bản không tạo thêm audio.

## Giới thiệu trên thẻ địa điểm
`PoiDb.dbo.Pois.VisitorDescription` lưu giới thiệu ngắn độc lập với `Description` (kịch bản thuyết minh). Migration 004 thêm cột; 005 điền giới thiệu cho 20 slug hiện có nếu chưa có nội dung. Không sửa kịch bản gốc, hash bản dịch hoặc audio đã lưu. Admin có hai ô riêng cho giới thiệu và thuyết minh. Thẻ khách chỉ hiện giới thiệu, danh mục, địa chỉ; không render bài đọc, kể cả khi chưa có giới thiệu. Giới thiệu hiện theo ngôn ngữ gốc; lựa chọn ngôn ngữ tiếp tục áp dụng cho tên và audio thuyết minh.

Nguồn tham khảo biên tập: https://vietnam.travel/places-to-go/southern-vietnam/ho-chi-minh-city/ ; https://vietnam.travel/things-to-do/7-must-see-attractions-hcmc/ ; https://visithcmc.vn/vi/bao-tang-my-thuat-thanh-pho-ho-chi-minh-ve-dep-huyen-bi-say-dam-long-nguoi/ . Nội dung giới thiệu được viết lại ngắn, không ghi giá vé/giờ mở cửa chưa xác minh.
