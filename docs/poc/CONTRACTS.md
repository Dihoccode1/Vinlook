# Hợp đồng phối hợp — nguồn sự thật và phần cần Duy chốt

> Current PoC scope,26October2026: online-only by Duy. Offline requirements in historical sections/examples are superseded by [ONLINE-SCOPE.md](ONLINE-SCOPE.md). Full online walking navigation,15POIs/16locales,AdminA and Monitoring remain mandatory.


Không tạo gateway/service thứ tư. Identity/Content/Usage tách DB; frontend adapter nhận origins riêng. Code route/schema hiện tại ở seed là chuẩn cho API đã triển khai; D006/D017 là chuẩn hành vi cho phần chưa triển khai. Hai bên giữ mock test riêng, không tự thống nhất khác baseline trong chat cá nhân.

## Đã chốt và được tái sử dụng ngay

- `/api/v1` và envelope `{data,requestId}` / `{error:{code,message,requestId}}`; assets URL ngoài JSON binary. Hạo đọc trực tiếp router/validation/fixtures Content và Identity để bám payload thật.
- Auth: JWT memory tab, `/auth/login`,`/me`, roles Staff/Manager từ DB; không lưu JWT localStorage. Mutation nội dung cần work session; monitor read active Staff/Manager không cần open session. Role UI không thay backend authorization.
- browserId UUID localStorage chỉ telemetry; không IP/GPS/fingerprint; cùng origin nhiều tab dùng chung. playbackId mỗi lượt,Pause/Resume giữ ID; Play tính ngay,Pause vẫn đếm; ended/closed/replaced kết thúc; close/mất mạng dùng90s fallback; heartbeat/dashboard30s. End đến trước start không hồi sinh. Timestamp server.
- Global currentListeners = distinct browser có lượt hợp lệ; per-POI = distinct browser theo POI, vì một browser nhiều tab nghe nhiều POI nên tổng các hàng có thể lớn hơn global. Không lấy tổng lượt phát làm số người. Không queue heartbeat offline cũ để phát lại như realtime.
- Body allowlist, request limits/rate limits phải chốt theo baseline/contract trước code phần thiếu; lỗi mất kết nối giữ last known value + timestamp/stale, không chuyển thành0.
- MapLibre/PMTiles và JS A* Web Worker trên graph OSM tiền xử lý là baseline; xem D009/011/012 cho thông số, nguồn/copyright/coverage/chunk/version/checksum. Không dùng đường thẳng hoặc tuyến fixture trong demo thật.
- Publication chỉ Manager đủ16locale/thumbnail/entrance/review; public UI chỉ published.16mã lấy `services/content/src/adapters/hybrid-v1.json`; không thêm aliaslocale mới.

## Đề xuất bridge cần Duy duyệt ở POC-TU-01 trước HTTP mới

D006 có outline Usage routes, D017 có payload nhưng chi tiết response/perPOI/config còn thiếu code. Tú lập `docs/poc/tu/usage-contract.md` đối chiếu từng route với D006, response shape/mã lỗi/CORS/body/rate limits/schema/index/quyền/expires/query; Hạo dùng adapter fixture đúng bản nháp đó hoặc interface semantic dưới đây, không phụ thuộc server đã lên.

Semantic interface UI: `presence(browserId)`, `start(browserId,playbackId,poiId,languageCode)`, `heartbeat(browserId,playbackId)`, `end(browserId,playbackId,reason)`, `summary(token)` trả asOf + onlineVisitors + currentListeners + danh sách counts theo poiId + trạng thái fresh/error. Đây là interface phối hợp, **không phải API/config/schema mới đã duyệt**. Hạo viết mapper tập trung để payload cuối không buộc sửa mọi component. Contract đề xuất khác baseline → hỏi Duy, chưa bật endpoint/live.

Tú kiểm tra chọn POI/locale hợp lệ qua Content public API theo ownership, không đọc DBContent từUsage. Quy định perPOI/privacy phải giữ; chưa có published data thì local integration tạo fixture disposable đúng publication criteria, không mở public draft.

## Chia sẻ package/data/dependency

Tú sở hữu `packages/poc-routing/**` + `data/poc/**`, đề xuất API Worker/manifest theo D009/012 và gửi Duy duyệt chi tiết chưa chốt. Hạo tạo adapter routing/fixture trong app, không đợi binarygraph cuối. Khi ready, Duy review bridge và cả hai chạy integration; fixture không thay route thật.

Không để cả hai sửa root package-lock.json cùng lúc. Mỗi người ghi dependency/pin/license/lý do vào Issue; Duy duyệt và đưa shared lock commit khi cần. MapLibre/PMTiles đã duyệt công nghệ nhưng bản ghim mới vẫn phải chốt. Mỗi người làm các phần không cần dependency mới trước. Shared contract đổi chỉ qua Duy với version/evidence, không chỉnh âm thầm để pass test.

Live shared env/Atlas/catalog/Content source/POI/Cloudinary/provider calls chỉ theo kế hoạch exact target/mutation/caps được Duy chấp thuận. Không dùng live như test fixture. Không chia sẻ password/secret trong issue, PR, ảnh hoặc chat AI.
