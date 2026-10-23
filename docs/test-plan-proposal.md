# Vinlook — D-019: Test Plan và tiêu chí nghiệm thu

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-079**. Dựa trên PRD/UC và DEC-051–078. Đây là kế hoạch kiểm thử, không phải báo cáo tất cả test đã chạy. Các case chi tiết và RTM tại test-cases.md / traceability-matrix.md.

## 1. Phạm vi và cách kiểm tra

| Lớp | Phạm vi | Công cụ/hình thức đã chọn |
|---|---|---|
| Unit | Rule GPS/lifecycle, permissions, versions, quota state, idempotency | Vitest; Python phù hợp MMS/harness khi có logic cần kiểm tra |
| API/integration | Auth/RBAC/session, transactions/outbox, lease/result, restore states | Supertest và Mongo replica set test tách biệt |
| UI/E2E | Luồng du khách/staff, offline/update/error, navigation cancellation, review/publish | Playwright Chromium + kiểm thử tay thiết bị thật |
| Provider | Locale/voice/dialect, timing/asset format, free tier | Sample thực có kiểm soát sau cấu hình; stub cho lỗi/quota trong CI |
| Operational/UAT | CI/CD release/rollback, backup/restore, checkpoint | Runbook và Duy nghiệm thu theo bằng chứng |

Không gọi Gemini/Azure hàng loạt trong CI để test concurrency hoặc tiêu quota. Stub chỉ kiểm tra logic lỗi/contract, không chứng minh giọng đọc thật. AI có thể soạn/chạy/giải thích test nhưng người review kết quả cần được Duy chỉ định; tài liệu chưa tự giao thành viên.

## 2. Điều kiện trước chạy

Build và cấu hình test có thể tái lập; dataset/registry/graph/app commit được ghim; credential test không vào log; namespace test không phải Production. Test destructive chạy trên fixture riêng. User secrets/GPS không đưa vào trace/video/report công khai.

Case chưa có app/dependency phải ghi NOT RUN hoặc BLOCKED cùng lý do, không sửa expected result để đạt. Mỗi kết quả ghi TC-ID, commit, thời gian, thiết bị/browser, preconditions, steps, actual/expected, evidence và defect link nếu có. Link Issue/PR chỉ điền khi đã tồn tại.

## 3. Thiết bị và waiver

- iPhone 11 Pro Max, iOS 26.5 do Duy báo; Chrome iOS có JSON thật, Safari vẫn target trước release theo DEC-071. Ghi bản browser/OS thực tế từng lượt, không suy từ model.
- Galaxy Note20 Ultra, Android 17 do Duy báo: **kiểm thử thiết bị Android waived tại DEC-070**, không yêu cầu lại để tiếp tục và không ghi executed/pass. Yêu cầu hỗ trợ Android giữ nguyên. Automated Chromium desktop không được đổi tên thành Android test.
- Desktop Chrome/Node harness có kết quả riêng trong research/routing-spike. 31 truy vấn graph-node không phải 31 tuyến thực địa và không thay end-to-end Vinlook.

## 4. Hiệu năng đề xuất

Giữ baseline 50 du khách đồng thời, ≥95% thao tác đo: map tương tác ≤10 s; search/nearby ≤2 s; audio bắt đầu ≤3 s; route/recalc ≤5 s. Báo từng loại thao tác, không gộp thao tác nhanh bù cho routing chậm.

Đề xuất mỗi loại ít nhất **100 lần đo** sau warm-up, với 50 visitor IDs/browser contexts độc lập và mix có map/search/audio/routing; dùng dữ liệu sẵn có, không giả 50 context desktop là 50 điện thoại thật. Ghi network, CPU/RAM, server state và tỷ lệ lỗi. Ít nhất 95/100 hoàn tất đúng trong ngưỡng; timeout/error tính là không đạt, không loại khỏi mẫu. Đồng thời báo p95 và tỷ lệ hoàn tất đúng.

Routing đo cả snap/A*/instructions/UI response trong điều kiện warm đã định; graph download/cold init báo riêng. Render cold wake/cold graph, first offline download và update báo riêng, không được giấu trong warm-up để tuyên bố trải nghiệm cold đạt. Audio phải đo từ Play tới có âm thanh/phát thực, không chỉ tới HTTP response.

Không định trước quota/băng thông đủ tải 50 khách. Chạy load trên môi trường đã cho phép và theo ngân sách; không tự load test dịch vụ public của bên thứ ba hoặc dùng TTS API thật cho mỗi visitor.

## 5. Offline và routing acceptance

Test tải đầy đủ, đóng tab, mất mạng hoàn toàn, mở lại, map/search/English audio/GPS/route/recalc. Phải ghi rõ Wi-Fi/mobile data off; “Prepare chạy được” không thay “Run tính được tuyến”. Browser eviction/mất file phải bỏ ready và có hướng khôi phục khi online; không hứa app mở được khi toàn bộ shell đã bị xóa.

Update giữ gói cũ khi thiếu file, checksum sai, quota đầy hoặc crash giữa chuyển con trỏ. Navigation giữ snapshot theo D-012 và dừng với synced deletion. Không tự cache JWT/admin API trong gói.

Routing dùng ít nhất 30 cặp điểm thực **phân tầng trung tâm/ngoại vi/vùng sáp nhập/đảo/mạng rời**, không chỉ chọn trong component lớn nhất. Mỗi cặp có vị trí vào/đích, graph/profile version và expected route property/no-route có căn cứ. Đối chiếu A*/Dijkstra kiểm tra thuật toán trên graph, còn access/barrier/bridge/entrance phải review dữ liệu riêng. Không ép mọi cặp phải có route để đạt.

Kiểm tra GPS accuracy/snap/arrival/reroute theo D-011, kết quả đến muộn/cancel theo D-012; synthetic fixtures chỉ hỗ trợ, không thay GPS thực. Chưa có vị trí POI/route mẫu đã duyệt thì case bị BLOCKED, không bịa tọa độ/lối vào.

## 6. Nội dung và bảo mật

15 POI ×16 ngôn ngữ đúng registry, cả UI strings/RTL/script và 240 audio được kiểm tra/duyệt; thời lượng 90–150 s, đúng textVersion/sourceVersion. Reviewers phải ghi mức kiểm tra thực tế, không gán hiểu biết ngôn ngữ không có. Model/voice tài liệu hỗ trợ chưa đủ để pass provider integration.

Kiểm tra JWT hết hạn/authVersion/lock, authorization mỗi request, session qua 00:00 VN, password Unicode/72-byte, recovery replay/expiry, mass assignment, secret leakage, restricted upload và stale result. Không thêm requirement pentest/certification ngoài scope hoặc tuyên bố đã an toàn tuyệt đối.

## 7. Gate nghiệm thu và báo cáo

Các checkpoint Day 5/10/15/20/25/30/35 giữ yêu cầu executable đã duyệt, không dùng hồ sơ/harness thay MVP sản phẩm. Build chạy, critical flows, schema/config compatibility, test quan trọng, docs/deploy instructions và trạng thái Issues/PR phải có bằng chứng thật. Có Critical/Blocker thì checkpoint không đạt.

Đề xuất Critical: mất/rò dữ liệu hoặc vượt quyền nghiêm trọng; Blocker: chặn chức năng Must-have/không có workaround phù hợp. Defect khác phải có disposition rõ được Duy chấp nhận, không tự bỏ qua. Waiver Android là quyết định riêng, không tự mở rộng sang Safari/nội dung/routing.

Test summary tách PASS/FAIL/NOT RUN/BLOCKED/WAIVED, link evidence và quyết định. Không ghi “đã kiểm thử Android thành công” thay waived. Duy là người xác nhận phase/checkpoint; chưa có phân công test/reviewer cụ thể hoặc Actual GitHub Issues ở kế hoạch này.

## 8. Phạm vi cần duyệt

1. Phạm vi/phương pháp, case catalog và traceability dự thảo; các test chưa chạy giữ NOT RUN.
2. Phép đo ≥100 lần mỗi loại thao tác, 50 khách, điều kiện warm/cold và tính timeout/lỗi vào tỷ lệ không đạt.
3. Gate nội dung/routing/offline/security/operations và phân loại kết quả/defect ở trên; Android waiver giữ nguyên.

Duyệt Test Plan không nghiệm thu sản phẩm, không mở Implementation hoặc tự tạo Issue/assignment. Công việc tiếp theo là hợp nhất schema/API và xử lý quyết định môi trường còn mở trước Design-wide review.

## Phê duyệt — DEC-079

Duy duyệt D-019, catalog 52 TC/RTM 37 UC và phương pháp đo/gates đã trình. Các test chưa chạy vẫn NOT RUN; Android vẫn waived. Không suy ra code, kế hoạch phân công hoặc Design tổng thể được duyệt.
