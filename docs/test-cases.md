# Vinlook — Test Cases đề xuất D-019

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-079**. Đây là catalog expected scenarios, không phải test report. D-019 quy định thiết lập/tài nguyên và evidence. Trước mỗi case tạo fixture phù hợp Use Case, account/phiên và dữ liệu ở trạng thái mô tả, ghi môi trường/commit/versions; không chạy vào Production tùy ý. Case cần app/integration chưa có giữ NOT RUN. Actor/preconditions đầy đủ theo UC nguồn, không giả mọi case dùng cùng user.

Các TC có nhiều assertions cần giữ kết quả từng assertion khi triển khai script; chưa tự tách task/Issue hoặc gán người. Android waiver có dòng riêng để không biến cả offline feature thành waived.


## TC-001 — Xem bản đồ và các POI công khai

- UC: UC-001; US: US-001, US-007, US-012, US-014; REQ: REQ-001, REQ-014; AC: AC-001, AC-014.
- Steps: Mở bản đồ online với dataset công khai.
- Expected: Hiển thị marker POI published chưa xóa, không yêu cầu login; không lộ draft.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-002 — Xem thông tin, ảnh và mô tả một POI

- UC: UC-002; US: US-001, US-007, US-010, US-012, US-014; REQ: REQ-001, REQ-010, REQ-014; AC: AC-001, AC-010, AC-014.
- Steps: Chạm marker và mở POI sheet.
- Expected: Đúng snapshot POI/description/thumbnail/audio, không tự Play hoặc Start walking.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-003 — Dùng vị trí hiện tại và xử lý quyền GPS

- UC: UC-003; US: US-001, US-002; REQ: REQ-002, REQ-025; AC: AC-002, AC-025.
- Steps: Từ chối GPS rồi thử map/search và Locate.
- Expected: Map/search/audio vẫn dùng được; chức năng cần tọa độ nêu denied và cách retry.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-004 — Xem/chọn từ các POI gần nhất

- UC: UC-004; US: US-001, US-002, US-003, US-007; REQ: REQ-003; AC: AC-003.
- Steps: Fixture có 6 POI, chỉ 3 trong 3 km; mở Nearby.
- Expected: Chỉ 3 POI đúng khoảng cách thẳng tăng dần; không lấy điểm ngoài bán kính để đủ 4.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-005 — Tìm kiếm và chọn POI

- UC: UC-005; US: US-001, US-003, US-004, US-005; REQ: REQ-004; AC: AC-004.
- Steps: Tìm POI bằng nameEN, chọn một kết quả.
- Expected: Focus đúng POI và cho Start walking tới một đích, không tự tạo itinerary.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-006 — Dẫn đường đi bộ đến một đích

- UC: UC-006; US: US-001, US-002, US-003, US-004, US-005, US-006, US-007; REQ: REQ-004, REQ-027; AC: AC-004, AC-027.
- Steps: Bắt đầu route rồi dùng các fix hợp lệ lệch >30 m ba lần.
- Expected: Tính lại theo cooldown 10 s; chỉ request hiện hành đổi tuyến; tổng thời gian đo theo D-019.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-007 — Tải dữ liệu offline lần đầu

- UC: UC-007; US: US-008, US-012; REQ: REQ-007, REQ-008, REQ-021; AC: AC-007, AC-008, AC-021.
- Steps: Tải gói lần đầu và kiểm tra mọi thành phần/hash.
- Expected: Chỉ ready sau khi đủ shell/map/graph/POI/English media; dữ liệu thiếu không ready.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-008 — Mở lại và tiếp tục dùng khi offline

- UC: UC-008; US: US-001, US-007, US-008, US-009, US-010, US-015; REQ: REQ-007, REQ-009; AC: AC-007, AC-009.
- Steps: Đóng tab sau tải đủ, tắt Wi-Fi/mobile data và mở lại.
- Expected: Map/search/English audio/GPS/route/recalc hoạt động offline; không cần login/network call bắt buộc.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-009 — Cập nhật gói offline đã có

- UC: UC-009; US: US-007, US-008, US-009, US-010, US-012, US-015; REQ: REQ-008, REQ-009, REQ-021; AC: AC-008, AC-009, AC-021.
- Steps: Update gói rồi làm hỏng file hoặc ngắt tải.
- Expected: Gói mới incomplete/retry; gói active cũ vẫn dùng; không trộn graph versions.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-010 — Chọn ngôn ngữ giao diện/nội dung du khách

- UC: UC-010; US: US-007, US-009, US-010, US-012, US-014, US-015; REQ: REQ-009, REQ-010; AC: AC-009, AC-010.
- Steps: Chọn lần lượt 16 locale online, sau đó mất mạng ở non-English.
- Expected: UI/text/audio đúng locale online; offline English, dừng non-English audio và chờ Play.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-011 — Nghe thuyết minh POI theo ngôn ngữ

- UC: UC-011; US: US-007, US-009, US-010, US-012, US-014, US-015; REQ: REQ-009, REQ-010, REQ-023; AC: AC-009, AC-010, AC-023.
- Steps: Play, Pause, Resume, đóng POI sheet rồi Close mini-player.
- Expected: Pause giữ lượt; đóng sheet tiếp tục audio; Close kết thúc; Play POI khác không chồng âm thanh.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-012 — Tạo/chỉnh sửa và lưu POI nháp

- UC: UC-012; US: US-012, US-014, US-018, US-022; REQ: REQ-014, REQ-018, REQ-019; AC: AC-014, AC-018, AC-019.
- Steps: Sửa draft với expectedEditVersion rồi xem published.
- Expected: Draft thay đổi đúng dependencies; published cũ không đổi; chỉ một working revision.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-013 — Chủ động chạy dịch và tạo audio

- UC: UC-013; US: US-011, US-012, US-013, US-014, US-018, US-022, US-029; REQ: REQ-011, REQ-013, REQ-018; AC: AC-011, AC-013, AC-018.
- Steps: Process snapshot đủ nguồn và theo dõi pipeline.
- Expected: 202 có job IDs; English không dịch sang chính nó; 16 text/audio đi qua dependency đúng, chưa tự publish.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-014 — Thử lại phần xử lý bị lỗi/chờ khi có điều kiện

- UC: UC-014; US: US-011, US-012, US-013, US-029; REQ: REQ-013, REQ-028; AC: AC-013, AC-028.
- Steps: Làm một job failed/waiting_quota rồi Staff retry.
- Expected: Chỉ phần lỗi đúng input được xử lý lại; phần tốt giữ nguyên, không chạy vòng retry vô hạn.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-015 — Kiểm tra và trình nội dung để duyệt công khai

- UC: UC-015; US: US-011, US-012, US-014, US-018, US-022; REQ: REQ-012, REQ-017; AC: AC-012, AC-017.
- Steps: Review đúng text/audio version rồi submit.
- Expected: Chỉ bản sẵn sàng vào in_review; nội dung khóa sửa; output stale không giữ approved.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-016 — Duyệt và công khai bản đủ 16 ngôn ngữ

- UC: UC-016; US: US-011, US-012, US-014, US-018, US-022; REQ: REQ-012, REQ-017; AC: AC-012, AC-017.
- Steps: Manager publish lần lượt bản thiếu một ngôn ngữ và bản đủ điều kiện.
- Expected: Bản thiếu bị từ chối; bản đủ 16 được đổi pointer kèm outbox/idempotency, không publish hai lần.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-017 — Đánh dấu xóa POI

- UC: UC-017; US: US-009, US-014, US-015, US-022, US-023; REQ: REQ-009, REQ-015, REQ-018, REQ-019; AC: AC-009, AC-015, AC-018, AC-019.
- Steps: Manager soft delete POI đang public.
- Expected: Ẩn public khi sync; giữ DB/revision/media/audit; tuyến tới đích đã sync deletion dừng.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-018 — Khôi phục POI đã đánh dấu xóa về nháp

- UC: UC-018; US: US-012, US-015, US-016, US-022, US-031; REQ: REQ-015, REQ-018, REQ-019, REQ-026; AC: AC-015, AC-018, AC-019, AC-026.
- Steps: Restore POI deleted.
- Expected: Có draft phải duyệt lại; không tự public hoặc tự khôi phục approval cũ.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-019 — Đăng ký nhân viên và nhận trạng thái chờ

- UC: UC-019; US: US-008, US-011, US-013, US-017, US-019, US-026; REQ: REQ-016, REQ-021; AC: AC-016, AC-021.
- Steps: Đăng ký đủ trường và password confirmation.
- Expected: Tạo pending Staff, bcrypt hash, không lưu confirmPassword và không cấp quyền active/Manager từ body.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-020 — Đăng nhập theo trạng thái/quyền tài khoản

- UC: UC-020; US: US-018, US-019, US-020; REQ: REQ-016, REQ-017; AC: AC-016, AC-017.
- Steps: Login active, reload tab rồi thử token hết hạn.
- Expected: JWT chỉ memory tab, hết 2 h/reload login lại; không tự tạo phiên ngày thứ hai.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-021 — Duyệt đăng ký để cấp quyền Staff

- UC: UC-021; US: US-017, US-019, US-020; REQ: REQ-016, REQ-017; AC: AC-016, AC-017.
- Steps: Manager approve pending Staff rồi Staff login.
- Expected: Chỉ Manager được approve; pending chưa approve không vào quyền Staff.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-022 — Thiết lập Manager đầu tiên

- UC: UC-022; US: US-020; REQ: REQ-016, REQ-029; AC: AC-016, AC-029.
- Steps: Operator bootstrap với chưa có Manager và thử bootstrap lại.
- Expected: Chỉ bootstrap đúng điều kiện và target; không nâng role signup đầu tiên hoặc tạo Manager trùng.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-023 — Khóa/mở khóa Staff và áp dụng quyền mới

- UC: UC-023; US: US-018, US-021, US-023; REQ: REQ-017; AC: AC-017.
- Steps: Khóa Staff đã login rồi gửi protected request mới.
- Expected: Request mới bị từ chối theo quyền hiện tại; history còn; request đã qua kiểm tra có thể hoàn tất theo quyết định đã duyệt.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-024 — Mở hoặc mở lại phiên làm việc cùng ngày

- UC: UC-024; US: US-018, US-022; REQ: REQ-018; AC: AC-018.
- Steps: Mở/đóng/mở lại phiên trong cùng ngày VN.
- Expected: Giữ một session ID/ngày, quyền mutation chỉ khi open; không nhận staffId/date tùy ý.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-025 — Đóng phiên làm việc

- UC: UC-025; US: US-018, US-022; REQ: REQ-018; AC: AC-018.
- Steps: Đưa clock test qua 00:00 VN rồi gọi mutation.
- Expected: Phiên ngày cũ đóng/không còn hợp lệ tại API, không phụ thuộc scheduler chạy đúng giây.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-026 — Xem lịch sử phiên theo quyền

- UC: UC-026; US: US-011, US-022, US-023; REQ: REQ-019; AC: AC-019.
- Steps: Staff và Manager xem audit, mô phỏng outbox giao lặp.
- Expected: Staff chỉ own, Manager all; eventId lặp một bản ghi, phiên/thời gian gốc giữ nguyên.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-027 — Xác minh Staff và cấp mã khôi phục

- UC: UC-027; US: US-018, US-024; REQ: REQ-020; AC: AC-020.
- Steps: Manager cấp recovery code sau xác minh.
- Expected: Mã 32 byte ngẫu nhiên, hết hạn 15 phút, chỉ hiển thị một lần, DB/log không lưu mã rõ.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-028 — Dùng mã khôi phục để đặt mật khẩu mới

- UC: UC-028; US: US-018, US-024; REQ: REQ-020; AC: AC-020.
- Steps: Reset bằng mã hợp lệ rồi dùng lại hoặc dùng mã hết hạn.
- Expected: Lần hợp lệ consume nguyên tử/tăng authVersion; replay/expiry thất bại, token cũ không dùng tiếp.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-029 — Khôi phục quyền truy cập Manager theo quy trình

- UC: UC-029; US: US-020, US-025; REQ: REQ-020; AC: AC-020.
- Steps: Operator chạy Manager recovery trong target thử.
- Expected: Audit operator và target rõ, không public backdoor, không tự unlock hoặc đổi role/email.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-030 — Xem số khách online hiện tại

- UC: UC-030; US: US-018, US-027; REQ: REQ-022; AC: AC-022.
- Steps: Hai tab cùng browser và hai browser độc lập heartbeat.
- Expected: Cùng browser đếm một, browser độc lập đếm riêng; >90 s stale bị loại.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-031 — Xem số người trong phiên nghe hiện tại

- UC: UC-031; US: US-010, US-027, US-028; REQ: REQ-022, REQ-023; AC: AC-022, AC-023.
- Steps: Phát hai tab, Pause một tab, đóng/end các playback đảo thứ tự.
- Expected: Đếm unique browser đang nghe; Pause vẫn tính; late start không hồi sinh ended playback.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-032 — Xem sức khỏe phụ thuộc và trạng thái xử lý nội dung

- UC: UC-032; US: US-008, US-011, US-013, US-017, US-019, US-026, US-029; REQ: REQ-021, REQ-024; AC: AC-021, AC-024.
- Steps: Dashboard refresh trong lúc một dependency timeout.
- Expected: Có asOf/checkedAt và unknown/unavailable; không biến số cũ thành 0; không poll nền giữ Render thức.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-033 — Tạo bản sao database và ảnh/audio đã duyệt

- UC: UC-033; US: US-014, US-023, US-031; REQ: REQ-026; AC: AC-026.
- Steps: Backup khi tất cả writers đã dừng trong môi trường thử.
- Expected: Ba DB/media/dataset manifest đủ hash; thiếu file incomplete; không tuyên bố snapshot nhất quán khi writers còn chạy.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-034 — Thử phục hồi từ bản sao và kiểm chứng kết quả

- UC: UC-034; US: US-014, US-023, US-031; REQ: REQ-026; AC: AC-026.
- Steps: Restore bộ backup vào local target tách biệt.
- Expected: Counts/indexes/references đúng, stale state được xử lý; không egress provider/Production, không restore nhầm target.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-035 — Chạy kiểm tra/test/build service qua CI

- UC: UC-035; US: US-032, US-033, US-035, US-036; REQ: REQ-028, REQ-029, REQ-031, REQ-032; AC: AC-028, AC-029, AC-031, AC-032.
- Steps: PR có một critical regression và PR kiểm tra đạt.
- Expected: Regression khiến CI fail, không CD; PR đạt có build/tests/contract consumers phù hợp và không dùng Prod secrets.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-036 — Triển khai service tự động khi checks/gate đạt

- UC: UC-036; US: US-032, US-033, US-035, US-036; REQ: REQ-028; AC: AC-028.
- Steps: Trusted main release đạt checks và mô phỏng deploy một service lỗi.
- Expected: CD tự động theo điều kiện đã duyệt; theo dõi deploy/smoke thực; dừng dependent rollout, không rollback DB tự động.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-037 — Xét bằng chứng và nghiệm thu checkpoint

- UC: UC-037; US: US-034; REQ: REQ-030; AC: AC-030.
- Steps: Duy nghiệm thu checkpoint với một blocker rồi khi có bằng chứng sửa.
- Expected: Có blocker không đánh dấu MVP đạt; bản executable đầy scope và artifacts/PR/issues có evidence mới được xem xét.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-038 — Password Unicode và giới hạn bcrypt

- UC: UC-019, UC-028; US: US-008, US-011, US-013, US-017, US-018, US-019, US-024, US-026; REQ: REQ-016, REQ-020, REQ-021; AC: AC-016, AC-020, AC-021.
- Steps: Thử 15 code points, 72 byte, >72 byte và confirm sai.
- Expected: Không truncate/prehash ngầm; chặn >72 byte, không trim password; đúng policy đã duyệt.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-039 — Hai nhân viên sửa đồng thời

- UC: UC-012, UC-016; US: US-011, US-012, US-014, US-018, US-022; REQ: REQ-012, REQ-014, REQ-017, REQ-018, REQ-019; AC: AC-012, AC-014, AC-017, AC-018, AC-019.
- Steps: Gửi cùng expectedEditVersion từ hai client.
- Expected: Một thay đổi nhận, thay đổi stale trả 409, không âm thầm ghi đè.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-040 — Worker mất lease và stale output

- UC: UC-013, UC-014; US: US-011, US-012, US-013, US-014, US-018, US-022, US-029; REQ: REQ-011, REQ-013, REQ-018, REQ-028; AC: AC-011, AC-013, AC-018, AC-028.
- Steps: Expire/reclaim rồi gửi result của attempt cũ.
- Expected: Không chấp nhận stale, không overwrite kết quả current; reclaim cap và retry manual đúng D-007.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-041 — Source thay đổi khi job đang chạy

- UC: UC-012, UC-013, UC-016; US: US-011, US-012, US-013, US-014, US-018, US-022, US-029; REQ: REQ-011, REQ-012, REQ-013, REQ-014, REQ-017, REQ-018, REQ-019; AC: AC-011, AC-012, AC-013, AC-014, AC-017, AC-018, AC-019.
- Steps: Tăng sourceVersion rồi gửi output snapshot cũ.
- Expected: Không đánh dấu output cũ là ready/approved cho nguồn mới.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-042 — Browser quota/checksum/crash

- UC: UC-007, UC-009; US: US-007, US-008, US-009, US-010, US-012, US-015; REQ: REQ-007, REQ-008, REQ-009, REQ-021; AC: AC-007, AC-008, AC-009, AC-021.
- Steps: Mô phỏng quota đầy, hash sai và reload giữa activation.
- Expected: Không ready sai; active cũ giữ nguyên, chỉ pointer hợp lệ được dùng.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-043 — Mất/kém GPS và arrival

- UC: UC-006; US: US-001, US-002, US-003, US-004, US-005, US-006, US-007; REQ: REQ-004, REQ-027; AC: AC-004, AC-027.
- Steps: Inject fix >50 m, mất fix, rồi <=25 m gần entrance.
- Expected: Không reroute/arrive từ fix kém hoặc cũ; tới nơi không autoplay audio.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-044 — Cancel, destination delete và update lúc navigation

- UC: UC-006, UC-009; US: US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008, US-009, US-010, US-012, US-015; REQ: REQ-004, REQ-008, REQ-009, REQ-021, REQ-027; AC: AC-004, AC-008, AC-009, AC-021, AC-027.
- Steps: Đổi đích khi tính, nhận result cũ, sync tombstone và tải gói mới.
- Expected: Bỏ stale result, dừng đích đã xóa, giữ snapshot active khi chưa có deletion.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-045 — Upload hạn chế và asset mismatch

- UC: UC-013, UC-016; US: US-011, US-012, US-013, US-014, US-018, US-022, US-029; REQ: REQ-011, REQ-012, REQ-013, REQ-017, REQ-018; AC: AC-011, AC-012, AC-013, AC-017, AC-018.
- Steps: Gửi reference sai namespace/type/size/duration.
- Expected: Không bind/publish asset sai; không lộ signing secret hoặc overwrite published asset.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-046 — Identity mất kết nối

- UC: UC-020, UC-023, UC-024; US: US-018, US-019, US-020, US-021, US-022, US-023; REQ: REQ-016, REQ-017, REQ-018; AC: AC-016, AC-017, AC-018.
- Steps: Gửi protected mutation lúc Identity unavailable.
- Expected: Không tiếp tục mutation bằng cache quyền; public/offline không bị buộc login.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-047 — Audit giao chậm sau commit

- UC: UC-012, UC-026; US: US-011, US-012, US-014, US-018, US-022, US-023; REQ: REQ-014, REQ-018, REQ-019; AC: AC-014, AC-018, AC-019.
- Steps: Commit POI+outbox rồi làm Identity unavailable, sau đó khôi phục.
- Expected: Không mất intent; audit xuất hiện chậm có scope đúng, retry không tạo duplicate.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-048 — Storage browserId và tab race

- UC: UC-030, UC-031; US: US-010, US-018, US-027, US-028; REQ: REQ-022, REQ-023; AC: AC-022, AC-023.
- Steps: Mở hai tab lần đầu đồng thời; từ chối storage ở case riêng.
- Expected: BrowserId hội tụ cùng origin hoặc fallback được ghi best effort; không dùng IP/fingerprint.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-049 — Quota/model/voice không có

- UC: UC-013, UC-014, UC-016; US: US-011, US-012, US-013, US-014, US-018, US-022, US-029; REQ: REQ-011, REQ-012, REQ-013, REQ-017, REQ-018, REQ-028; AC: AC-011, AC-012, AC-013, AC-017, AC-018, AC-028.
- Steps: Stub quota, capacity 429, unsupported voice và kiểm sample thực có kiểm soát.
- Expected: Không auto paid/fallback locale; waiting_quota/failed phân loại rõ; không publish thiếu locale.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-050 — 50 khách và performance

- UC: UC-001, UC-004, UC-006, UC-011; US: US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-009, US-010, US-012, US-014, US-015; REQ: REQ-001, REQ-003, REQ-004, REQ-009, REQ-010, REQ-014, REQ-023, REQ-027; AC: AC-001, AC-003, AC-004, AC-009, AC-010, AC-014, AC-023, AC-027.
- Steps: Đo >=100 lần mỗi loại với mix 50 khách theo D-019.
- Expected: >=95% mỗi loại hoàn tất đúng trong ngưỡng; timeout/errors tính không đạt; cold riêng.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-051 — 16 locale, RTL và nội dung

- UC: UC-010, UC-011, UC-016; US: US-007, US-009, US-010, US-011, US-012, US-014, US-015, US-018, US-022; REQ: REQ-009, REQ-010, REQ-012, REQ-017, REQ-023; AC: AC-009, AC-010, AC-012, AC-017, AC-023.
- Steps: Review UI resources, text/script/voice/duration trên 15 POI.
- Expected: Đủ 240 bản duyệt và UI đúng; không gán native reviewer nếu không có.
- Status: **NOT RUN**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.

## TC-052 — Android physical-device verification waived

- UC: UC-008; US: US-001, US-007, US-008, US-009, US-010, US-015; REQ: REQ-007, REQ-009; AC: AC-007, AC-009.
- Steps: Không chạy case thiết bị Android theo DEC-070.
- Expected: Ghi WAIVED_BY_DUY, không fabricated PASS; không mở rộng waiver sang Safari.
- Status: **WAIVED — DEC-070**. Evidence/Actual/Defect/Issue/PR: chưa có, trừ waiver đã dẫn.
