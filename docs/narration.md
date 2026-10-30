# Thuyết minh bằng Gemini TTS

Nút Nghe thuyết minh gọi POST /api/pois/:id/narration với JSON { "language": "vi" }. Backend lấy nội dung POI gốc hoặc bản dịch, gọi Gemini TTS và trả audio/wav. Giao diện phát HTML audio, hỗ trợ tạm dừng, tiếp tục và dừng. Đổi POI, đóng chi tiết hoặc đổi ngôn ngữ sẽ dừng audio và hủy request phía client. Request Google đang chạy có thể hoàn tất để lưu cache.

Cấu hình .env backend, sau đó khởi động lại translation service:

```env
GEMINI_API_KEY=your_key
GEMINI_TTS_MODEL=gemini-3.8-flash-tts
GEMINI_TTS_VOICE=Kore
GEMINI_TTS_STYLE=
```

Giọng mặc định Kore, phong cách hướng dẫn viên ấm áp, rõ ràng, tốc độ vừa phải, ngắt nghỉ tự nhiên và đọc cẩn thận tên địa điểm. Để trống GEMINI_TTS_STYLE dùng preset này; điền hướng dẫn riêng nếu cần. Đổi phong cách cũng làm mới cache audio. Đây là chỉ dẫn cho model, không bảo đảm thời lượng chính xác.

Tạo key ở Google AI Studio, bảo đảm project có quyền truy cập model và quota phù hợp. Không commit key hoặc đưa vào biến VITE_. Google Translate vẫn dùng GOOGLE_TRANSLATE_API_KEY riêng cho dịch văn bản; nghe bản gốc chỉ cần key Gemini. Không fallback sang giọng trình duyệt.

API dùng https://generativelanguage.googleapis.com/v1beta/interactions, trả WAV mono 24 kHz. Hướng dẫn chính thức: https://ai.google.dev/gemini-api/docs/speech-generation . Thiếu key trả 503, quota/bận trả 429, timeout trả 504, lỗi provider trả 502. Tạo audio tối đa 120 giây; Gateway cho 175 giây gồm cả dịch.

Cache audio trong RAM translation service, giới hạn 32 MB và hai tác vụ tạo audio đồng thời; lớp RAM mất khi restart. Khóa cache gồm POI, ngôn ngữ, nội dung, model và giọng. Cùng yêu cầu đang chạy dùng chung tác vụ. audio WAV lưu trong SQL Server tại TranslationDb.dbo.poi_narrations (VARBINARY(MAX)). Mỗi POI và ngôn ngữ giữ một bản mới nhất; hash nội dung/model/giọng/phong cách quyết định có tái sử dụng được hay không. Cache RAM là lớp tăng tốc; restart backend vẫn đọc audio từ SQL. Cache văn bản cũng ở SQL Server.

Ba bài mẫu hướng tới 2–3 phút, thời lượng thực tế tùy kết quả Gemini. Sau khi có key cần kiểm tra nghe và thời lượng thực tế. Unit test dùng WAV giả, không gọi Google hoặc tiêu quota. Kiểm tra thủ công: nghe, tạm dừng, tiếp tục, dừng, chuyển POI/ngôn ngữ, kiểm tra thiếu key và lỗi dịch.


## Chuẩn bị sẵn nội dung trước khi khách sử dụng

Chạy `npm run content:prepare -w @tourism/translation-service` để dịch toàn bộ POI đã xuất bản sang 16 ngôn ngữ rồi tạo audio và lưu SQL. Chạy lại sẽ bỏ qua nội dung có hash và provider khớp. Nếu lỗi/quota, tác vụ dừng, phần đã lưu vẫn giữ và có thể tiếp tục bằng cùng lệnh. Có thể giới hạn ngôn ngữ: `npm run content:prepare -w @tourism/translation-service -- vi en`; chỉ dịch văn bản: thêm `--text-only`.

`TRANSLATION_PROVIDER=gemini` dùng GEMINI_API_KEY để dịch lẫn tạo giọng, model văn bản cấu hình qua GEMINI_TRANSLATION_MODEL (mặc định gemini-3.5-flash-lite). `TRANSLATION_PROVIDER=google` dùng Google Translate với GOOGLE_TRANSLATE_API_KEY. Tác vụ cần POI service và SQL Server đang chạy. Nên chạy trước khi phục vụ khách và sau khi sửa nội dung, vì bản chưa chuẩn bị vẫn phải chờ tạo lần đầu. Tạo hàng loạt tiêu hạn mức API, đặc biệt audio nhiều ngôn ngữ.

Tác vụ chuẩn bị tiếp tục qua các ngôn ngữ dịch lỗi để vẫn tạo audio cho ngôn ngữ đã có. Bảng tổng kết ghi số lượng sẵn sàng và lỗi; exit code 1 nếu chưa hoàn tất. TTS hết quota/thiếu key thì dừng lượt tạo audio còn lại. Có thể chạy cùng lệnh sau khi quota được khôi phục; không tự lập lịch gọi lại API.

## File audio tạo sẵn (không có trang quản lý)

audio WAV lưu tại `services/translation-service/storage/narrations/<POI UUID>/<language>-<content hash>.wav`, đồng thời lưu trong SQL Server như trước. Cache tìm bản đã lưu theo nội dung, ngôn ngữ, model, giọng và phong cách; có bản phù hợp thì không gọi Gemini lại. Ngôn ngữ khách tạo lần đầu cũng được lưu cả file và database. Ghi file qua file tạm rồi rename để tránh đọc trúng file đang viết.

`npm run audio:prepare-defaults` chuẩn bị Việt, Anh, Trung (vi, en, zh-CN) cho các POI đã xuất bản; giữ lại bản đã có và dừng nếu TTS hết quota. `npm run audio:export-files -w @tourism/translation-service` xuất các audio có sẵn trong SQL thành WAV mà không gọi API. Folder WAV không commit lên Git. Bản đã xuất vẫn tồn tại khi đóng tab hoặc restart process; SQL là bản lưu dùng chung, file là bản local được tái sử dụng hoặc phục hồi SQL khi thiếu.

Đã xóa trang Kho thuyết minh và các endpoint trạng thái/prepare dành cho trang đó. Giao diện khách chỉ dùng nút nghe hiện có. Việc có đủ 300 bản dịch văn bản không đồng nghĩa đã tạo đủ 60 audio mặc định; phải căn cứ các file hoặc bản ghi audio thực tế.

## Tạo giọng bằng Gemini, Azure Speech và Google Cloud TTS

Cấu hình backend trong .env, rồi khởi động lại translation service:

```env
TTS_PROVIDERS=gemini,azure,google
GEMINI_API_KEY=...
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=southeastasia
GOOGLE_TTS_API_KEY=...
```

Chỉ các provider có cấu hình mới được đưa vào pool. Không tự dùng key Gemini làm key Azure hoặc Cloud TTS. Để dùng Azure miễn phí, tạo Speech resource ở tier Free F0; code không tự tạo hoặc nâng cấp resource. Với Google, bật Cloud Text-to-Speech API và dùng key giới hạn cho API này. Adapter Google chỉ chọn Standard voices, không tự nâng sang giọng Premium. Hạn mức miễn phí, billing và quyền truy cập vẫn do tài khoản của từng dịch vụ quyết định.

Các yêu cầu tạo audio độc lập được chia vòng tròn cho provider có cấu hình. Mỗi provider tối đa một tác vụ trong pool, toàn service tối đa hai tác vụ tạo mới cùng lúc. Khi một bên lỗi, timeout hoặc hết quota, thử bên khác; không gọi nhiều API để tạo trùng cùng một audio thành công. Quota cooldown 60 giây, lỗi khác 10 giây; đây không phải cách tăng quota của nhà cung cấp. Các bản có sẵn vẫn phát dù hàng tạo mới đang bận.

Hai adapter mới hỗ trợ ba ngôn ngữ mặc định: Việt (vi), Anh (en), Trung giản thể (zh-CN). Các ngôn ngữ còn lại tiếp tục dùng Gemini. Azure dùng vi-VN-HoaiMyNeural, en-US-JennyNeural, zh-CN-XiaoxiaoNeural; Google dùng vi-VN-Standard-A, en-US-Standard-C, cmn-CN-Standard-A. Kết quả đều là WAV PCM mono 24 kHz để lưu cùng hệ thống file và SQL hiện có. SSML Azure được escape để văn bản không trở thành lệnh điều khiển giọng đọc.

Cache pool giữ khả năng đọc các bản Gemini cũ có cùng nội dung và cấu hình giọng; thêm provider không buộc tạo lại các bản đó. File/SQL dùng hash cấu hình pool cho bản mới. Nhãn giao diện chỉ ghi giọng AI vì các bài có thể do các dịch vụ khác nhau tạo.

Tài liệu: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech và https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize . Test adapter dùng WAV giả và kiểm tra header xác thực, giọng theo ngôn ngữ, fallback, chạy song song, tái sử dụng cache. Cần key dịch vụ thật để kiểm tra sinh giọng thực tế.
