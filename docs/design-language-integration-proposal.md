# Vinlook — D-018: tích hợp dịch/TTS và kiểm soát miễn phí

Ngày 23/10/2026. **ĐÃ DUYỆT — phương án B, DEC-078**. Cơ sở REQ-010–013/028–032, UC-013–016, D-007/013/017. Không gọi API, tạo resource/key hoặc tải model trong bước này.

## 1. Nơi thực thi adapter

| Phương án | Mô tả | Lợi ích / chi phí |
|---|---|---|
| A | Cả Gemini, Azure và MMS chạy trong Python worker local, vẫn claim/result qua POI API | Không dùng RAM hosted cho adapter/TTS processing, nhưng mọi pipeline phụ thuộc máy local; mở rộng nhiệm vụ worker và phân phối thêm provider keys xuống máy nhóm |
| **B — Đề xuất** | Gemini/Azure adapter nằm trong POI & Content process; local Python chỉ MMS pcm và xử lý file do tác vụ này tạo | Giữ secret cloud ở backend và phân công runtime rõ; POI process cần điều phối job bền vững, chịu cold sleep/restart và kiểm chứng RAM/thời gian tác vụ |

Không thêm Render service thứ tư, Redis/broker hoặc máy cloud trả phí. B không giữ HTTP từ frontend suốt pipeline: API lưu job rồi trả 202. Adapter nội bộ nhận việc với lease/attempt/state như worker, không có queue chỉ trong RAM. Restart không mất intent hoặc nhận kết quả stale. Không ping giữ Render thức; job có thể chờ service hoạt động và phải hiển thị trạng thái trung thực, không cam kết pipeline chạy liên tục khi service sleep.

Đề xuất mỗi adapter cloud tối đa **1 tác vụ đang gọi provider tại một thời điểm**, MMS local tối đa **1 tác vụ** để đo trên máy 16 GB. Đây là giới hạn prototype cần duyệt, không phải quota provider. Provider calls phải có timeout hữu hạn cấu hình theo task; timeout không chứng minh provider chưa làm việc, do đó giữ attempt và đối soát trước retry. Tham số timeout cụ thể cần đo khi tích hợp, không tự ghi “exactly once”.

## 2. Danh mục locale/voice ứng viên

Đề xuất lưu registry cấu hình có version trong repo, phân biệt languageCode của Vinlook với providerLocale/voiceId/modelId. Job snapshot ghim registry version và voice/model đầu vào; đổi registry không tự sửa media published hoặc tự gọi provider.

| Ngôn ngữ Vinlook | languageCode đề xuất | Locale / voice ứng viên |
|---|---|---|
| English | en | en-US / en-US-JennyNeural |
| Mandarin, Traditional | zh-Hant | zh-TW / zh-TW-HsiaoChenNeural |
| Hindi | hi | hi-IN / hi-IN-SwaraNeural |
| Spanish | es | es-ES / es-ES-ElviraNeural |
| Modern Standard Arabic | ar | ar-SA / ar-SA-ZariyahNeural, cần kiểm tra đọc văn bản MSA |
| French | fr | fr-FR / fr-FR-DeniseNeural |
| Bengali | bn | bn-BD / bn-BD-NabanitaNeural |
| Portuguese Portugal | pt-PT | pt-PT / pt-PT-RaquelNeural |
| Indonesian | id | id-ID / id-ID-GadisNeural |
| Urdu | ur | ur-PK / ur-PK-UzmaNeural |
| Russian | ru | ru-RU / ru-RU-SvetlanaNeural |
| German | de | de-DE / de-DE-KatjaNeural |
| Japanese | ja | ja-JP / ja-JP-NanamiNeural |
| Nigerian Pidgin | pcm | facebook/mms-tts-pcm local |
| Egyptian Arabic | ar-EG | ar-EG / ar-EG-SalmaNeural, cần kiểm tra đúng văn bản dialect |
| Vietnamese | vi | vi-VN / vi-VN-HoaiMyNeural |

Nguồn registry voice: [Microsoft language/voice support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts), kiểm tra 23/10/2026. Có tên trong tài liệu không chứng minh được cấp ở region/resource F0 cụ thể hoặc chất lượng nội dung của Vinlook. MSA và Egyptian Arabic phải kiểm tra text lẫn phát âm, không coi hai voice tự bảo đảm hai biến thể. Registry này đề xuất thêm các locale chưa chốt riêng; ưu tiên ứng viên giọng chuẩn, không avatar/voice cloning/HD trả phí.

Model pcm có [model card Meta](https://huggingface.co/facebook/mms-tts-pcm) và license CC-BY-NC-4.0. Giữ mục đích đồ án phi thương mại và attribution đã chọn; không chuyển mục đích thương mại từ phê duyệt này. Chưa có benchmark sinh audio pcm trên máy nhóm.

**Gemini model ID:** chưa chốt một tên model khi chưa kiểm tra tài khoản. Đề xuất chỉ dùng model stable có Free tier thực tế trong project, ghi ID/quota cùng cấu hình để Duy xác nhận trước gọi thật; không dùng alias tự đổi model, preview hoặc chuyển model trả phí khi lỗi. Danh sách công khai không thay quyền/quota tài khoản. [Models](https://ai.google.dev/gemini-api/docs/models), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

## 3. Dịch và audio

- English source không dịch sang chính nó. 15 POI ×15 bản dịch = **225 bản dịch**; Azure 15 POI ×15 ngôn ngữ có Azure = **225 audio**; MMS 15 pcm audio; tổng 240 audio, chưa tính retry.
- Dịch từng ngôn ngữ từ sourceVersion, nêu rõ script/locale/dialect, giữ tên riêng, số liệu/lịch sử theo nguồn đã duyệt, không tự thêm sự kiện. Đầu ra plain text, không nhận HTML/script/SSML do mô hình tự sinh để chạy thẳng.
- Prompt chỉ gửi nội dung POI công khai đã được phép xử lý, không gửi credential, tài khoản nhân viên hoặc GPS du khách. Kết quả Gemini là nội dung chưa duyệt; không dùng phản hồi model làm chỉ thị vận hành hoặc gọi tool.
- Staff kiểm tra text/audio và thời lượng; sai dialect/giọng/mất nội dung thì changes_required, không công khai để đủ số lượng. Kiểm tra máy/back-translation có thể hỗ trợ nhưng không được ghi là người biết ngôn ngữ đã xác minh nếu không có.
- Đề xuất FFmpeg local trong Python worker để chuyển audio MMS sang MP3 mono theo D-013; không thêm API chuyển đổi trả phí. Việc chọn binary/build/license và dependency pin sẽ ghi ở cấu hình trước khi cài, không tải thực thi ngầm trong request sản phẩm.
- Với Azure ưu tiên output MP3 phù hợp đã hỗ trợ; xác minh header, duration/format và asset sau upload. Nếu cần chuyển đổi, đề xuất adapter xử lý trong runtime đã chọn, phải đo tài nguyên; không tự hạ chất lượng hoặc đổi bitrate mục tiêu để vừa quota.
- Không ép audio 90–150 giây bằng cắt mất nội dung hoặc kéo tốc độ quá mức. Text cần viết đủ độ dài và duyệt; sửa text/tốc độ/voice phải ghi version, sinh lại và kiểm tra như D-013.

## 4. Free-only và quota

Microsoft công bố Free neural TTS 0,5 triệu ký tự/tháng: [Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/). Quota/tốc độ và hạn chế region/resource phải kiểm tra thực tế: [quotas](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits). Không suy rằng 225 audio luôn vừa quota; cần đếm input thực và cả lần gọi lại. 429 còn có thể liên quan capacity, không tự kết luận mọi 429 là hết tháng.

Đề xuất trạng thái waiting_quota cho quota/rate-limit đã nhận diện; lỗi không rõ hoặc voice/region không hỗ trợ thành failed với mã rõ. Có thời điểm retry gợi ý nếu provider trả Retry-After, nhưng vẫn Staff quyết định retry theo baseline; không tự retry vô hạn hoặc tự đăng ký thêm account né quota.

Trước bắt đầu bộ dữ liệu: ghi tier/resource/model/region, quota còn lại, ký tự/tokens dự kiến và budget cho sửa nội dung. Giữ dashboard/portal provider làm nguồn kiểm chứng quota; counters app chỉ là ước lượng và không được hiển thị như số billing chính thức. Không chọn collection usage ledger mới từ tài liệu này.

Không nâng F0→S0, bật billing Gemini hay chọn paid voice/model. Nếu free quota không đủ mốc, dừng phần chưa chạy và trình ảnh hưởng Day 5/35 để Duy chọn; không giảm 16 ngôn ngữ hoặc thay audio thật bằng mock.

## 5. Bằng chứng trước public content/release

1. Registry cả 16 hoạt động đúng tier miễn phí và model pcm chạy được; locale/voice không được âm thầm đổi.
2. Một POI mẫu đủ 16 text/audio kiểm tra đầu-cuối và thời lượng; ghi reviewer thực tế/giới hạn hiểu ngôn ngữ. Không coi mẫu là đủ 15 POI.
3. Chạy đủ 15×16 bản duyệt, giữ lỗi/quota/job history và snapshot, không mất phần đã thành công.
4. Chứng minh stale input/expired lease/repeated callback không publish hoặc ghi đè sai.
5. Kiểm tra English offline và toàn bộ UI strings 16 ngôn ngữ; dịch description không đồng nghĩa UI đã được dịch. Các nhãn UI là resource version trong frontend, phải kiểm tra RTL cho Arabic/Urdu, font và chữ phồn thể.

Các kiểm chứng thuộc implementation/testing sau gate và Issue đủ điều kiện, chưa được thực hiện trong bước này. Day 5 dữ liệu thật vẫn là yêu cầu đã chốt, chưa có bằng chứng đáp ứng.

## 6. Quyết định cần Duy

1. Chọn **A hoặc B** cho adapter placement; đề xuất B.
2. Duyệt registry locale/voice ứng viên, cấu hình version và nguyên tắc chỉ chốt Gemini model sau kiểm tra Free tier thực tế.
3. Duyệt concurrency 1/adapter, hướng FFmpeg cho MMS và các quy tắc quota/chất lượng/version ở trên.

Không thay provider đã chọn, scope, deadline hoặc mở gate Implementation. Nếu cần đổi voice/model sau khi kiểm tra thì ghi điều chỉnh để Duy xác nhận, không tự chuyển trả phí.

## Kết quả phê duyệt — DEC-078

Duy chọn B: Gemini/Azure adapters trong POI & Content process, local Python cho MMS. Duy duyệt phần còn lại: registry ứng viên/config version, chốt Gemini model sau xác minh Free tier, concurrency 1/adapter, FFmpeg MMS và quota/quality rules. Chưa có provider credentials, model cụ thể hoặc tích hợp thật; không mở Implementation.
