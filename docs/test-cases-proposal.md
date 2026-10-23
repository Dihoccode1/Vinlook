# Vinlook — Test Case catalog đề xuất

Ngày 23/10/2026. **PROPOSED — NOT RUN**. 74 case baseline (2 case/UC), chưa phải bộ kiểm thử đầy đủ hoặc code test. Các expected results lấy UC và Design đã duyệt tới DEC-076; D-017 còn pending. D-018 trình cách tổ chức/gate kiểm thử riêng.

## TC-001 — UC-001: Xem bản đồ và các POI công khai (happy path)

**Status:** NOT RUN. **Trace:** UC-001; REQ-001, REQ-014; AC-001, AC-014; US-001, US-007, US-012, US-014; FEAT-001, FEAT-004; SEQ-001.

**Preconditions:**

- Có dữ liệu công khai hợp lệ; online hoặc có gói offline đủ theo US-007.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Mở bản đồ với snapshot 15 POI công khai.

**Expected:** Thấy đúng marker trong coverage, không yêu cầu đăng nhập.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-002 — UC-001: Xem bản đồ và các POI công khai (exception/edge)

**Status:** NOT RUN. **Trace:** UC-001; REQ-001, REQ-014; AC-001, AC-014; US-001, US-007, US-012, US-014; FEAT-001, FEAT-004; SEQ-001.

**Preconditions:**

- Có dữ liệu công khai hợp lệ; online hoặc có gói offline đủ theo US-007.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Có thêm draft hoặc POI soft-deleted.

**Expected:** Public data không lộ draft/POI đã xóa.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-003 — UC-002: Xem thông tin, ảnh và mô tả một POI (happy path)

**Status:** NOT RUN. **Trace:** UC-002; REQ-001, REQ-010, REQ-014; AC-001, AC-010, AC-014; US-001, US-007, US-010, US-012, US-014; FEAT-001, FEAT-003, FEAT-004; SEQ-001.

**Preconditions:**

- Có dữ liệu công khai hợp lệ; online hoặc có gói offline đủ theo US-007.
- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Chọn POI công khai và ngôn ngữ.

**Expected:** Đúng mô tả/thumbnail theo published revision.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-004 — UC-002: Xem thông tin, ảnh và mô tả một POI (exception/edge)

**Status:** NOT RUN. **Trace:** UC-002; REQ-001, REQ-010, REQ-014; AC-001, AC-010, AC-014; US-001, US-007, US-010, US-012, US-014; FEAT-001, FEAT-003, FEAT-004; SEQ-001.

**Preconditions:**

- Có dữ liệu công khai hợp lệ; online hoặc có gói offline đủ theo US-007.
- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Sửa draft trong khi khách đọc.

**Expected:** Khách vẫn đọc published, không thấy thay đổi chưa duyệt.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-005 — UC-003: Dùng vị trí hiện tại và xử lý quyền GPS (happy path)

**Status:** NOT RUN. **Trace:** UC-003; REQ-002, REQ-025; AC-002, AC-025; US-001, US-002; FEAT-001, FEAT-002; SEQ-001.

**Preconditions:**

- Mở Vinlook trên thiết bị hỗ trợ vị trí.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Cho phép GPS và nhận fix hợp lệ.

**Expected:** Vị trí hiển thị, chức năng phụ thuộc vị trí sẵn dùng.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-006 — UC-003: Dùng vị trí hiện tại và xử lý quyền GPS (exception/edge)

**Status:** NOT RUN. **Trace:** UC-003; REQ-002, REQ-025; AC-002, AC-025; US-001, US-002; FEAT-001, FEAT-002; SEQ-001.

**Preconditions:**

- Mở Vinlook trên thiết bị hỗ trợ vị trí.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Từ chối GPS hoặc mất fix.

**Expected:** Map/search/audio còn dùng; GPS unavailable không giả cập nhật.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-007 — UC-004: Xem/chọn từ các POI gần nhất (happy path)

**Status:** NOT RUN. **Trace:** UC-004; REQ-003; AC-003; US-001, US-002, US-003, US-007; FEAT-001; SEQ-001.

**Preconditions:**

- Có vị trí và tập POI công khai phù hợp dữ liệu đang sử dụng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Đặt 5 POI trong 3 km và một POI ngoài 3 km.

**Expected:** Chỉ 4 gần nhất theo khoảng cách thẳng.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-008 — UC-004: Xem/chọn từ các POI gần nhất (exception/edge)

**Status:** NOT RUN. **Trace:** UC-004; REQ-003; AC-003; US-001, US-002, US-003, US-007; FEAT-001; SEQ-001.

**Preconditions:**

- Có vị trí và tập POI công khai phù hợp dữ liệu đang sử dụng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Chỉ có 2 hoặc 0 POI trong bán kính.

**Expected:** Trả đúng 2 hoặc empty, không mở rộng bán kính.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-009 — UC-005: Tìm kiếm và chọn POI (happy path)

**Status:** NOT RUN. **Trace:** UC-005; REQ-004; AC-004; US-001, US-003, US-004, US-005; FEAT-001, FEAT-002; SEQ-001.

**Preconditions:**

- Có POI công khai trong dữ liệu đang dùng; cần GPS để yêu cầu tuyến.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Tìm một POI và chọn kết quả.

**Expected:** Mở đúng POI, đích là một điểm.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-010 — UC-005: Tìm kiếm và chọn POI (exception/edge)

**Status:** NOT RUN. **Trace:** UC-005; REQ-004; AC-004; US-001, US-003, US-004, US-005; FEAT-001, FEAT-002; SEQ-001.

**Preconditions:**

- Có POI công khai trong dữ liệu đang dùng; cần GPS để yêu cầu tuyến.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Query không có kết quả.

**Expected:** Empty state cho sửa query, không tự chọn POI khác.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-011 — UC-006: Dẫn đường đi bộ đến một đích (happy path)

**Status:** NOT RUN. **Trace:** UC-006; REQ-004, REQ-027; AC-004, AC-027; US-001, US-002, US-003, US-004, US-005, US-006, US-007; FEAT-001, FEAT-002; SEQ-002.

**Preconditions:**

- Có POI công khai trong dữ liệu đang dùng; cần GPS để yêu cầu tuyến.
- GPS khả dụng, có đích, dữ liệu cần thiết và tuyến đi bộ hợp lệ.
- Đang yêu cầu tuyến hoặc đang dẫn đường.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Start walking với fix/entrance/graph hợp lệ rồi lệch tuyến đủ điều kiện.

**Expected:** Có geometry/instructions và tính lại đúng đích theo D-011/012.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-012 — UC-006: Dẫn đường đi bộ đến một đích (exception/edge)

**Status:** NOT RUN. **Trace:** UC-006; REQ-004, REQ-027; AC-004, AC-027; US-001, US-002, US-003, US-004, US-005, US-006, US-007; FEAT-001, FEAT-002; SEQ-002.

**Preconditions:**

- Có POI công khai trong dữ liệu đang dùng; cần GPS để yêu cầu tuyến.
- GPS khả dụng, có đích, dữ liệu cần thiết và tuyến đi bộ hợp lệ.
- Đang yêu cầu tuyến hoặc đang dẫn đường.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Đổi đích lúc request cũ chưa xong hoặc GPS mất.

**Expected:** Không nhận stale result; giữ trạng thái GPS đúng, không vẽ đường thẳng giả tuyến.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-013 — UC-007: Tải dữ liệu offline lần đầu (happy path)

**Status:** NOT RUN. **Trace:** UC-007; REQ-007, REQ-008, REQ-021; AC-007, AC-008, AC-021; US-008, US-012; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-003.

**Preconditions:**

- Online, có gói được cung cấp; có thể đã có gói cũ.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Tải gói English đủ tất cả file/checksum.

**Expected:** Chỉ ready sau đủ app/map/graph/text/ảnh/audio.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-014 — UC-007: Tải dữ liệu offline lần đầu (exception/edge)

**Status:** NOT RUN. **Trace:** UC-007; REQ-007, REQ-008, REQ-021; AC-007, AC-008, AC-021; US-008, US-012; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-003.

**Preconditions:**

- Online, có gói được cung cấp; có thể đã có gói cũ.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Lỗi mạng/checksum/quota giữa tải.

**Expected:** Incomplete + Retry, không báo đủ offline.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-015 — UC-008: Mở lại và tiếp tục dùng khi offline (happy path)

**Status:** NOT RUN. **Trace:** UC-008; REQ-007, REQ-009; AC-007, AC-009; US-001, US-007, US-008, US-009, US-010, US-015; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-003.

**Preconditions:**

- Đã chuẩn bị/tải đủ dữ liệu khi online; GPS và quyền khả dụng cho chức năng cần vị trí.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Đóng tab, tắt Wi-Fi/mobile data, mở lại gói đã đủ.

**Expected:** Map/search/nearby/GPS/audio/route/recalc local hoạt động.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-016 — UC-008: Mở lại và tiếp tục dùng khi offline (exception/edge)

**Status:** NOT RUN. **Trace:** UC-008; REQ-007, REQ-009; AC-007, AC-009; US-001, US-007, US-008, US-009, US-010, US-015; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-003.

**Preconditions:**

- Đã chuẩn bị/tải đủ dữ liệu khi online; GPS và quyền khả dụng cho chức năng cần vị trí.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Thiếu graph hoặc browser storage đã bị xóa.

**Expected:** Không báo package ready; không tự dùng request mạng như offline đạt.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-017 — UC-009: Cập nhật gói offline đã có (happy path)

**Status:** NOT RUN. **Trace:** UC-009; REQ-008, REQ-009, REQ-021; AC-008, AC-009, AC-021; US-007, US-008, US-009, US-010, US-012, US-015; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-003.

**Preconditions:**

- Online, có gói được cung cấp; có thể đã có gói cũ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Chủ động cập nhật candidate đủ và đồng bộ tombstone online.

**Expected:** Chuyển active đúng version; ẩn POI xóa đã nhận.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-018 — UC-009: Cập nhật gói offline đã có (exception/edge)

**Status:** NOT RUN. **Trace:** UC-009; REQ-008, REQ-009, REQ-021; AC-008, AC-009, AC-021; US-007, US-008, US-009, US-010, US-012, US-015; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-003.

**Preconditions:**

- Online, có gói được cung cấp; có thể đã có gói cũ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Update thất bại hoặc đang navigation.

**Expected:** Giữ gói cũ; giữ graph snapshot navigation trừ đích đã xóa theo D-012.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-019 — UC-010: Chọn ngôn ngữ giao diện/nội dung du khách (happy path)

**Status:** NOT RUN. **Trace:** UC-010; REQ-009, REQ-010; AC-009, AC-010; US-007, US-009, US-010, US-012, US-014, US-015; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-001.

**Preconditions:**

- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Chọn lần lượt 16 ngôn ngữ online.

**Expected:** UI/text/audio đúng ngôn ngữ và biến thể đã chọn.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-020 — UC-010: Chọn ngôn ngữ giao diện/nội dung du khách (exception/edge)

**Status:** NOT RUN. **Trace:** UC-010; REQ-009, REQ-010; AC-009, AC-010; US-007, US-009, US-010, US-012, US-014, US-015; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-001.

**Preconditions:**

- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Mất mạng khi đang dùng non-English.

**Expected:** UI/text English; dừng non-English audio, không autoplay English.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-021 — UC-011: Nghe thuyết minh POI theo ngôn ngữ (happy path)

**Status:** NOT RUN. **Trace:** UC-011; REQ-009, REQ-010, REQ-023; AC-009, AC-010, AC-023; US-007, US-009, US-010, US-012, US-014, US-015; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-001.

**Preconditions:**

- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Play/Pause/Resume rồi nghe hết hoặc Close mini-player.

**Expected:** Pause giữ lượt, kết thúc đóng đúng playback theo D-015.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-022 — UC-011: Nghe thuyết minh POI theo ngôn ngữ (exception/edge)

**Status:** NOT RUN. **Trace:** UC-011; REQ-009, REQ-010, REQ-023; AC-009, AC-010, AC-023; US-007, US-009, US-010, US-012, US-014, US-015; FEAT-001, FEAT-002, FEAT-003, FEAT-004; SEQ-001.

**Preconditions:**

- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Đóng sheet hoặc Play POI khác.

**Expected:** Sheet dùng mini-player; POI khác kết thúc lượt cũ, không phát chồng trong tab.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-023 — UC-012: Tạo/chỉnh sửa và lưu POI nháp (happy path)

**Status:** NOT RUN. **Trace:** UC-012; REQ-014, REQ-018, REQ-019; AC-014, AC-018, AC-019; US-012, US-014, US-018, US-022; FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- Có quyền, online, phiên mở; có dữ liệu đầu vào phù hợp.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Mở phiên và lưu một draft với expectedEditVersion đúng.

**Expected:** Draft tăng version, published giữ nguyên.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-024 — UC-012: Tạo/chỉnh sửa và lưu POI nháp (exception/edge)

**Status:** NOT RUN. **Trace:** UC-012; REQ-014, REQ-018, REQ-019; AC-014, AC-018, AC-019; US-012, US-014, US-018, US-022; FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- Có quyền, online, phiên mở; có dữ liệu đầu vào phù hợp.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Hai người save cùng version cũ hoặc draft thứ hai.

**Expected:** 409/không ghi đè; tối đa một draft/in_review.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-025 — UC-013: Chủ động chạy dịch và tạo audio (happy path)

**Status:** NOT RUN. **Trace:** UC-013; REQ-011, REQ-013, REQ-018; AC-011, AC-013, AC-018; US-011, US-012, US-013, US-014, US-018, US-022, US-029; FEAT-003, FEAT-005; SEQ-007.

**Preconditions:**

- Tài khoản có quyền, online, phiên làm việc mở và có nguồn tiếng Anh.
- Có công việc đang xử lý/chờ/lỗi; thao tác chủ động cần quyền, online và phiên mở.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Staff chủ động Process snapshot English hiện tại.

**Expected:** 202 job IDs; đủ tác vụ cần thiết, English không dịch sang chính nó.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-026 — UC-013: Chủ động chạy dịch và tạo audio (exception/edge)

**Status:** NOT RUN. **Trace:** UC-013; REQ-011, REQ-013, REQ-018; AC-011, AC-013, AC-018; US-011, US-012, US-013, US-014, US-018, US-022, US-029; FEAT-003, FEAT-005; SEQ-007.

**Preconditions:**

- Tài khoản có quyền, online, phiên làm việc mở và có nguồn tiếng Anh.
- Có công việc đang xử lý/chờ/lỗi; thao tác chủ động cần quyền, online và phiên mở.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Provider quota/lỗi hoặc worker mất kết nối.

**Expected:** Trạng thái lỗi/chờ minh bạch; không publish/không retry provider vô hạn.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-027 — UC-014: Thử lại phần xử lý bị lỗi/chờ khi có điều kiện (happy path)

**Status:** NOT RUN. **Trace:** UC-014; REQ-013, REQ-028; AC-013, AC-028; US-011, US-012, US-013, US-029; FEAT-003, FEAT-005; SEQ-007.

**Preconditions:**

- Theo DEC-050: đã có công việc lỗi/chờ; đây là lần khởi phát độc lập, không phải extend UC-013. Cần tài khoản có quyền, phiên hiện tại mở và dịch vụ/worker/quota khả dụng khi thực hiện thử lại.

- Có công việc đang xử lý/chờ/lỗi; thao tác chủ động cần quyền, online và phiên mở.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Staff retry phần failed/waiting_quota đủ điều kiện.

**Expected:** Chỉ xử lý phần cần, giữ output tốt.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-028 — UC-014: Thử lại phần xử lý bị lỗi/chờ khi có điều kiện (exception/edge)

**Status:** NOT RUN. **Trace:** UC-014; REQ-013, REQ-028; AC-013, AC-028; US-011, US-012, US-013, US-029; FEAT-003, FEAT-005; SEQ-007.

**Preconditions:**

- Theo DEC-050: đã có công việc lỗi/chờ; đây là lần khởi phát độc lập, không phải extend UC-013. Cần tài khoản có quyền, phiên hiện tại mở và dịch vụ/worker/quota khả dụng khi thực hiện thử lại.

- Có công việc đang xử lý/chờ/lỗi; thao tác chủ động cần quyền, online và phiên mở.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Input đã đổi hoặc lease attempt cũ trả result.

**Expected:** Không nhận stale output; không tái gán snapshot cũ lên draft mới.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-029 — UC-015: Kiểm tra và trình nội dung để duyệt công khai (happy path)

**Status:** NOT RUN. **Trace:** UC-015; REQ-012, REQ-017; AC-012, AC-017; US-011, US-012, US-014, US-018, US-022; FEAT-003, FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- Online, phiên mở và có bản cần kiểm tra/duyệt.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Review đúng phiên bản text/audio và submit.

**Expected:** Ghi đúng reviewer/version; chuyển in_review.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-030 — UC-015: Kiểm tra và trình nội dung để duyệt công khai (exception/edge)

**Status:** NOT RUN. **Trace:** UC-015; REQ-012, REQ-017; AC-012, AC-017; US-011, US-012, US-014, US-018, US-022; FEAT-003, FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- Online, phiên mở và có bản cần kiểm tra/duyệt.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Sửa text/source sau review hoặc chưa mở phiên.

**Expected:** Mất hiệu lực phụ thuộc đúng D-013; mutation bị chặn khi phiên đóng.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-031 — UC-016: Duyệt và công khai bản đủ 16 ngôn ngữ (happy path)

**Status:** NOT RUN. **Trace:** UC-016; REQ-012, REQ-017; AC-012, AC-017; US-011, US-012, US-014, US-018, US-022; FEAT-003, FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- Online, phiên mở và có bản cần kiểm tra/duyệt.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Manager publish bản đủ 16 nội dung approved và metadata/entrance.

**Expected:** Đổi pointer + audit outbox nguyên tử trong POI DB.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-032 — UC-016: Duyệt và công khai bản đủ 16 ngôn ngữ (exception/edge)

**Status:** NOT RUN. **Trace:** UC-016; REQ-012, REQ-017; AC-012, AC-017; US-011, US-012, US-014, US-018, US-022; FEAT-003, FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- Online, phiên mở và có bản cần kiểm tra/duyệt.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Thiếu một audio/current version hoặc Staff gọi publish.

**Expected:** Từ chối, published pointer cũ giữ nguyên.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-033 — UC-017: Đánh dấu xóa POI (happy path)

**Status:** NOT RUN. **Trace:** UC-017; REQ-009, REQ-015, REQ-018, REQ-019; AC-009, AC-015, AC-018, AC-019; US-009, US-014, US-015, US-022, US-023; FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- Manager có quyền, online, phiên mở, POI tồn tại.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Manager soft delete POI khi phiên mở.

**Expected:** Ẩn public, lưu deletedAt/actor và giữ DB/media/audit.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-034 — UC-017: Đánh dấu xóa POI (exception/edge)

**Status:** NOT RUN. **Trace:** UC-017; REQ-009, REQ-015, REQ-018, REQ-019; AC-009, AC-015, AC-018, AC-019; US-009, US-014, US-015, US-022, US-023; FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- Manager có quyền, online, phiên mở, POI tồn tại.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Staff gọi delete hoặc xóa khi phiên đóng.

**Expected:** Bị từ chối, dữ liệu không biến mất.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-035 — UC-018: Khôi phục POI đã đánh dấu xóa về nháp (happy path)

**Status:** NOT RUN. **Trace:** UC-018; REQ-015, REQ-018, REQ-019, REQ-026; AC-015, AC-018, AC-019, AC-026; US-012, US-015, US-016, US-022, US-031; FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- POI đã xóa logic và dữ liệu cần phục hồi còn giữ; Manager online, phiên mở.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Manager restore POI đã xóa.

**Expected:** Tạo draft và quy trình rereview, không tự công khai.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-036 — UC-018: Khôi phục POI đã đánh dấu xóa về nháp (exception/edge)

**Status:** NOT RUN. **Trace:** UC-018; REQ-015, REQ-018, REQ-019, REQ-026; AC-015, AC-018, AC-019, AC-026; US-012, US-015, US-016, US-022, US-031; FEAT-004, FEAT-005; SEQ-006.

**Preconditions:**

- POI đã xóa logic và dữ liệu cần phục hồi còn giữ; Manager online, phiên mở.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Restore một POI đang hoạt động/draft conflict.

**Expected:** Báo trạng thái/xung đột rõ, không tạo nhiều draft.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-037 — UC-019: Đăng ký nhân viên và nhận trạng thái chờ (happy path)

**Status:** NOT RUN. **Trace:** UC-019; REQ-016, REQ-021; AC-016, AC-021; US-008, US-011, US-013, US-017, US-019, US-026; FEAT-003, FEAT-005; SEQ-004.

**Preconditions:**

- Online, chưa được cấp quyền Staff cho đăng ký này.
- Đang truy cập luồng tương ứng, theo đúng quyền và điều kiện mạng của luồng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Đăng ký fullName/email/password/confirm hợp lệ.

**Expected:** Pending approval, không tự có quyền Staff.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-038 — UC-019: Đăng ký nhân viên và nhận trạng thái chờ (exception/edge)

**Status:** NOT RUN. **Trace:** UC-019; REQ-016, REQ-021; AC-016, AC-021; US-008, US-011, US-013, US-017, US-019, US-026; FEAT-003, FEAT-005; SEQ-004.

**Preconditions:**

- Online, chưa được cấp quyền Staff cho đăng ký này.
- Đang truy cập luồng tương ứng, theo đúng quyền và điều kiện mạng của luồng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Confirm lệch hoặc password >72 byte UTF-8.

**Expected:** Validation fail, không lưu confirm/password rõ.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-039 — UC-020: Đăng nhập theo trạng thái/quyền tài khoản (happy path)

**Status:** NOT RUN. **Trace:** UC-020; REQ-016, REQ-017; AC-016, AC-017; US-018, US-019, US-020; FEAT-005; SEQ-004.

**Preconditions:**

- Online, có tài khoản tương ứng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Login email/password của account active.

**Expected:** JWT 2 giờ trong memory tab; đăng nhập lại không tạo phiên ngày mới.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-040 — UC-020: Đăng nhập theo trạng thái/quyền tài khoản (exception/edge)

**Status:** NOT RUN. **Trace:** UC-020; REQ-016, REQ-017; AC-016, AC-017; US-018, US-019, US-020; FEAT-005; SEQ-004.

**Preconditions:**

- Online, có tài khoản tương ứng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Reload/token hết hạn/tài khoản bị khóa.

**Expected:** Yêu cầu login hoặc từ chối current authorization, không token browser storage.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-041 — UC-021: Duyệt đăng ký để cấp quyền Staff (happy path)

**Status:** NOT RUN. **Trace:** UC-021; REQ-016, REQ-017; AC-016, AC-017; US-017, US-019, US-020; FEAT-005; SEQ-004.

**Preconditions:**

- Manager online và được xác thực; có đăng ký chờ.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Manager duyệt Staff pending.

**Expected:** Account active và audit actor/time.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-042 — UC-021: Duyệt đăng ký để cấp quyền Staff (exception/edge)

**Status:** NOT RUN. **Trace:** UC-021; REQ-016, REQ-017; AC-016, AC-017; US-017, US-019, US-020; FEAT-005; SEQ-004.

**Preconditions:**

- Manager online và được xác thực; có đăng ký chờ.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Staff tự duyệt tài khoản hoặc caller không quyền.

**Expected:** Bị chặn server, không tăng role.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-043 — UC-022: Thiết lập Manager đầu tiên (happy path)

**Status:** NOT RUN. **Trace:** UC-022; REQ-016, REQ-029; AC-016, AC-029; US-020; FEAT-005; SEQ-004.

**Preconditions:**

- Môi trường được thiết lập; quy trình setup và người thực hiện cần được duyệt.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Operator bootstrap Manager trên target chưa có Manager.

**Expected:** Tạo đúng target và operator audit.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-044 — UC-022: Thiết lập Manager đầu tiên (exception/edge)

**Status:** NOT RUN. **Trace:** UC-022; REQ-016, REQ-029; AC-016, AC-029; US-020; FEAT-005; SEQ-004.

**Preconditions:**

- Môi trường được thiết lập; quy trình setup và người thực hiện cần được duyệt.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Chạy bootstrap lại hoặc đăng ký public đầu tiên.

**Expected:** Không tự tạo thêm Manager hoặc nâng quyền người đầu tiên.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-045 — UC-023: Khóa/mở khóa Staff và áp dụng quyền mới (happy path)

**Status:** NOT RUN. **Trace:** UC-023; REQ-017; AC-017; US-018, US-021, US-023; FEAT-005; SEQ-004.

**Preconditions:**

- Manager xác thực online, tài khoản Staff tồn tại.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Manager lock/unlock Staff và thử token cũ.

**Expected:** Quyền hiện tại áp dụng cho request sau kiểm tra.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-046 — UC-023: Khóa/mở khóa Staff và áp dụng quyền mới (exception/edge)

**Status:** NOT RUN. **Trace:** UC-023; REQ-017; AC-017; US-018, US-021, US-023; FEAT-005; SEQ-004.

**Preconditions:**

- Manager xác thực online, tài khoản Staff tồn tại.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Request đã qua kiểm tra đang commit khi lock.

**Expected:** Có thể hoàn tất theo DEC-056; không tuyên bố rollback ngược.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-047 — UC-024: Mở hoặc mở lại phiên làm việc cùng ngày (happy path)

**Status:** NOT RUN. **Trace:** UC-024; REQ-018; AC-018; US-018, US-022; FEAT-005; SEQ-005.

**Preconditions:**

- Xác thực online, có quyền tương ứng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Open/reopen phiên trong cùng ngày VN.

**Expected:** Một id cho staff/date, không tạo phiên thứ hai.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-048 — UC-024: Mở hoặc mở lại phiên làm việc cùng ngày (exception/edge)

**Status:** NOT RUN. **Trace:** UC-024; REQ-018; AC-018; US-018, US-022; FEAT-005; SEQ-005.

**Preconditions:**

- Xác thực online, có quyền tương ứng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Qua ngày VN rồi thao tác với phiên hôm trước.

**Expected:** Không dùng phiên cũ làm phiên mở ngày mới.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-049 — UC-025: Đóng phiên làm việc (happy path)

**Status:** NOT RUN. **Trace:** UC-025; REQ-018; AC-018; US-018, US-022; FEAT-005; SEQ-005.

**Preconditions:**

- Xác thực online, có quyền tương ứng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Close thủ công hoặc qua 00:00 VN.

**Expected:** Phiên đóng, mutation yêu cầu phiên bị chặn.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-050 — UC-025: Đóng phiên làm việc (exception/edge)

**Status:** NOT RUN. **Trace:** UC-025; REQ-018; AC-018; US-018, US-022; FEAT-005; SEQ-005.

**Preconditions:**

- Xác thực online, có quyền tương ứng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Scheduler chưa chạy nhưng API nhận ngày mới.

**Expected:** API vẫn enforce ngày VN, không dựa riêng cron.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-051 — UC-026: Xem lịch sử phiên theo quyền (happy path)

**Status:** NOT RUN. **Trace:** UC-026; REQ-019; AC-019; US-011, US-022, US-023; FEAT-005; SEQ-005.

**Preconditions:**

- Xác thực online, có lịch sử thao tác để đọc.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Xem audit với Staff và Manager.

**Expected:** Staff chỉ của mình, Manager toàn hệ thống.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-052 — UC-026: Xem lịch sử phiên theo quyền (exception/edge)

**Status:** NOT RUN. **Trace:** UC-026; REQ-019; AC-019; US-011, US-022, US-023; FEAT-005; SEQ-005.

**Preconditions:**

- Xác thực online, có lịch sử thao tác để đọc.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Identity gián đoạn sau POI commit.

**Expected:** Outbox giữ sự kiện, hiển thị chậm rồi ghi một lần theo eventId/phiên gốc.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-053 — UC-027: Xác minh Staff và cấp mã khôi phục (happy path)

**Status:** NOT RUN. **Trace:** UC-027; REQ-020; AC-020; US-018, US-024; FEAT-005; SEQ-004.

**Preconditions:**

- Manager xác minh đúng nhân viên; online ở các bước thực hiện trên hệ thống.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Manager xác minh rồi cấp recovery code Staff.

**Expected:** Mã một lần 15 phút, hash lưu, không gửi email tự động.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-054 — UC-027: Xác minh Staff và cấp mã khôi phục (exception/edge)

**Status:** NOT RUN. **Trace:** UC-027; REQ-020; AC-020; US-018, US-024; FEAT-005; SEQ-004.

**Preconditions:**

- Manager xác minh đúng nhân viên; online ở các bước thực hiện trên hệ thống.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Caller không quyền hoặc đọc lại mã từ log.

**Expected:** Không cấp/lộ code rõ, audit kết quả.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-055 — UC-028: Dùng mã khôi phục để đặt mật khẩu mới (happy path)

**Status:** NOT RUN. **Trace:** UC-028; REQ-020; AC-020; US-018, US-024; FEAT-005; SEQ-004.

**Preconditions:**

- Manager xác minh đúng nhân viên; online ở các bước thực hiện trên hệ thống.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Staff dùng mã còn hạn để đặt password mới.

**Expected:** Consume mã + hash + authVersion nguyên tử.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-056 — UC-028: Dùng mã khôi phục để đặt mật khẩu mới (exception/edge)

**Status:** NOT RUN. **Trace:** UC-028; REQ-020; AC-020; US-018, US-024; FEAT-005; SEQ-004.

**Preconditions:**

- Manager xác minh đúng nhân viên; online ở các bước thực hiện trên hệ thống.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Mã hết hạn/dùng lại hoặc password confirm sai.

**Expected:** Không đổi password; token version cũ bị từ chối sau reset thành công.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-057 — UC-029: Khôi phục quyền truy cập Manager theo quy trình (happy path)

**Status:** NOT RUN. **Trace:** UC-029; REQ-020; AC-020; US-020, US-025; FEAT-005; SEQ-004.

**Preconditions:**

- Có trường hợp mất truy cập cần xử lý và quy trình đã được Duy duyệt.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Operator chạy recovery Manager đúng target.

**Expected:** Mã một lần và operator audit; Manager tự reset.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-058 — UC-029: Khôi phục quyền truy cập Manager theo quy trình (exception/edge)

**Status:** NOT RUN. **Trace:** UC-029; REQ-020; AC-020; US-020, US-025; FEAT-005; SEQ-004.

**Preconditions:**

- Có trường hợp mất truy cập cần xử lý và quy trình đã được Duy duyệt.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Không có quyền operator hoặc Manager đang locked.

**Expected:** Không backdoor/tự unlock, dừng và báo cần người có quyền.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-059 — UC-030: Xem số khách online hiện tại (happy path)

**Status:** NOT RUN. **Trace:** UC-030; REQ-022; AC-022; US-018, US-027; FEAT-006; SEQ-008.

**Preconditions:**

- Xác thực online, có tín hiệu hiện diện từ khách kết nối.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Nhiều tab một browser heartbeat, hai browser chung IP.

**Expected:** Đếm theo browser, không theo tab/IP.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-060 — UC-030: Xem số khách online hiện tại (exception/edge)

**Status:** NOT RUN. **Trace:** UC-030; REQ-022; AC-022; US-018, US-027; FEAT-006; SEQ-008.

**Preconditions:**

- Xác thực online, có tín hiệu hiện diện từ khách kết nối.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Heartbeat quá 90 giây hoặc dashboard fetch lỗi.

**Expected:** Loại stale theo rule; lỗi hiển thị stale/unavailable, không ép số 0.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-061 — UC-031: Xem số người trong phiên nghe hiện tại (happy path)

**Status:** NOT RUN. **Trace:** UC-031; REQ-022, REQ-023; AC-022, AC-023; US-010, US-027, US-028; FEAT-003, FEAT-006; SEQ-008.

**Preconditions:**

- Monitoring online; các sự kiện Play/Pause/kết thúc/đóng trang được nhận hoặc timeout áp dụng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Play/Pause/Resume/End và dashboard refresh 30 giây.

**Expected:** Pause vẫn đếm; hết/đóng loại lượt đúng, distinct browser.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-062 — UC-031: Xem số người trong phiên nghe hiện tại (exception/edge)

**Status:** NOT RUN. **Trace:** UC-031; REQ-022, REQ-023; AC-022, AC-023; US-010, US-027, US-028; FEAT-003, FEAT-006; SEQ-008.

**Preconditions:**

- Monitoring online; các sự kiện Play/Pause/kết thúc/đóng trang được nhận hoặc timeout áp dụng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Mất kết nối/offline lâu hơn 90 giây.

**Expected:** Không báo realtime offline; timeout loại stale; không dùng D-017 chưa duyệt làm baseline.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-063 — UC-032: Xem sức khỏe phụ thuộc và trạng thái xử lý nội dung (happy path)

**Status:** NOT RUN. **Trace:** UC-032; REQ-021, REQ-024; AC-021, AC-024; US-008, US-011, US-013, US-017, US-019, US-026, US-029; FEAT-003, FEAT-005, FEAT-006; SEQ-008.

**Preconditions:**

- Xác thực và kết nối online.
- Đang truy cập luồng tương ứng, theo đúng quyền và điều kiện mạng của luồng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Dashboard đọc backend/DB/worker/job status.

**Expected:** Hiện tình trạng và thời điểm theo quyền.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-064 — UC-032: Xem sức khỏe phụ thuộc và trạng thái xử lý nội dung (exception/edge)

**Status:** NOT RUN. **Trace:** UC-032; REQ-021, REQ-024; AC-021, AC-024; US-008, US-011, US-013, US-017, US-019, US-026, US-029; FEAT-003, FEAT-005, FEAT-006; SEQ-008.

**Preconditions:**

- Xác thực và kết nối online.
- Đang truy cập luồng tương ứng, theo đúng quyền và điều kiện mạng của luồng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Dependency không phản hồi hoặc account bị khóa.

**Expected:** Thông báo unavailable/deny; không lộ secrets hoặc GPS cá nhân.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-065 — UC-033: Tạo bản sao database và ảnh/audio đã duyệt (happy path)

**Status:** NOT RUN. **Trace:** UC-033; REQ-026; AC-026; US-014, US-023, US-031; FEAT-004, FEAT-005; SEQ-009.

**Preconditions:**

- Có dữ liệu và quy trình sao lưu/phục hồi được duyệt; người thực hiện được chỉ định sau.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Maintenance dừng writers rồi dump 3 DB + media manifests.

**Expected:** Complete chỉ khi DB/media/checksum đầy đủ và lưu an toàn.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-066 — UC-033: Tạo bản sao database và ảnh/audio đã duyệt (exception/edge)

**Status:** NOT RUN. **Trace:** UC-033; REQ-026; AC-026; US-014, US-023, US-031; FEAT-004, FEAT-005; SEQ-009.

**Preconditions:**

- Có dữ liệu và quy trình sao lưu/phục hồi được duyệt; người thực hiện được chỉ định sau.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Thiếu một asset hoặc writer vẫn hoạt động.

**Expected:** Backup incomplete/không qua gate, không coi dump đơn lẻ là snapshot nhất quán.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-067 — UC-034: Thử phục hồi từ bản sao và kiểm chứng kết quả (happy path)

**Status:** NOT RUN. **Trace:** UC-034; REQ-026; AC-026; US-014, US-023, US-031; FEAT-004, FEAT-005; SEQ-009.

**Preconditions:**

- Có dữ liệu và quy trình sao lưu/phục hồi được duyệt; người thực hiện được chỉ định sau.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Restore trial vào local tách biệt theo D-014.

**Expected:** Counts/indexes/references/media được kiểm, có biên bản.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-068 — UC-034: Thử phục hồi từ bản sao và kiểm chứng kết quả (exception/edge)

**Status:** NOT RUN. **Trace:** UC-034; REQ-026; AC-026; US-014, US-023, US-031; FEAT-004, FEAT-005; SEQ-009.

**Preconditions:**

- Có dữ liệu và quy trình sao lưu/phục hồi được duyệt; người thực hiện được chỉ định sau.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Target là Production hoặc egress provider vẫn bật.

**Expected:** Dừng trial, không ghi vào Production/replay job thật.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-069 — UC-035: Chạy kiểm tra/test/build service qua CI (happy path)

**Status:** NOT RUN. **Trace:** UC-035; REQ-028, REQ-029, REQ-031, REQ-032; AC-028, AC-029, AC-031, AC-032; US-032, US-033, US-035, US-036; FEAT-001; SEQ-009.

**Preconditions:**

- Design được duyệt về số lượng/ranh giới, data ownership, hợp đồng giao tiếp và nơi triển khai; đáp ứng ràng buộc miễn phí.
- Có hợp đồng service, quy trình release, checks và quyền/secrets được thiết lập theo Design đã duyệt; chưa có các cấu hình này trong bản tài liệu hiện tại.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** PR thay thành phần chạy checks/build/test phù hợp.

**Expected:** Chỉ checks đủ mới đủ điều kiện release.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-070 — UC-035: Chạy kiểm tra/test/build service qua CI (exception/edge)

**Status:** NOT RUN. **Trace:** UC-035; REQ-028, REQ-029, REQ-031, REQ-032; AC-028, AC-029, AC-031, AC-032; US-032, US-033, US-035, US-036; FEAT-001; SEQ-009.

**Preconditions:**

- Design được duyệt về số lượng/ranh giới, data ownership, hợp đồng giao tiếp và nơi triển khai; đáp ứng ràng buộc miễn phí.
- Có hợp đồng service, quy trình release, checks và quyền/secrets được thiết lập theo Design đã duyệt; chưa có các cấu hình này trong bản tài liệu hiện tại.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Build/test/contract fail.

**Expected:** Không deploy thành phần phụ thuộc hoặc báo CI pass giả.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-071 — UC-036: Triển khai service tự động khi checks/gate đạt (happy path)

**Status:** NOT RUN. **Trace:** UC-036; REQ-028; AC-028; US-032, US-033, US-035, US-036; FEAT-001; SEQ-009.

**Preconditions:**

- Design được duyệt về số lượng/ranh giới, data ownership, hợp đồng giao tiếp và nơi triển khai; đáp ứng ràng buộc miễn phí.
- Có hợp đồng service, quy trình release, checks và quyền/secrets được thiết lập theo Design đã duyệt; chưa có các cấu hình này trong bản tài liệu hiện tại.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Main đạt gate được phép kích hoạt CD.

**Expected:** Hosted components tự deploy và smoke xác nhận; worker local qua runbook.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-072 — UC-036: Triển khai service tự động khi checks/gate đạt (exception/edge)

**Status:** NOT RUN. **Trace:** UC-036; REQ-028; AC-028; US-032, US-033, US-035, US-036; FEAT-001; SEQ-009.

**Preconditions:**

- Design được duyệt về số lượng/ranh giới, data ownership, hợp đồng giao tiếp và nơi triển khai; đáp ứng ràng buộc miễn phí.
- Có hợp đồng service, quy trình release, checks và quyền/secrets được thiết lập theo Design đã duyệt; chưa có các cấu hình này trong bản tài liệu hiện tại.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Deploy hook nhận nhưng build fail hoặc smoke fail.

**Expected:** Không coi HTTP hook là release ready; dừng rollout liên quan.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-073 — UC-037: Xét bằng chứng và nghiệm thu checkpoint (happy path)

**Status:** NOT RUN. **Trace:** UC-037; REQ-030; AC-030; US-034; FEAT-001; SEQ-009.

**Preconditions:**

- Deliverable từng bước được chuẩn bị; Requirement/Design phải duyệt trước code ứng dụng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Duy xem executable MVP toàn scope tại checkpoint.

**Expected:** Có evidence build/runtime/data/test/Issue/PR và không Critical/Blocker.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.

## TC-074 — UC-037: Xét bằng chứng và nghiệm thu checkpoint (exception/edge)

**Status:** NOT RUN. **Trace:** UC-037; REQ-030; AC-030; US-034; FEAT-001; SEQ-009.

**Preconditions:**

- Deliverable từng bước được chuẩn bị; Requirement/Design phải duyệt trước code ứng dụng.

**Test data/input:** Chuẩn bị dữ liệu phục vụ tình huống sau, tài khoản/phiên theo đúng actor UC; dùng fixture/dev cho lỗi, không phá Production.

**Steps:** Chỉ có harness nghiên cứu hoặc thiếu feature bắt buộc.

**Expected:** Không đánh dấu MVP đạt; không tự giảm scope/đổi deadline.

**Evidence khi chạy:** commit/app/data/config version, môi trường, input thực, actual result, timestamp và log/screenshot/JSON phù hợp; không log credential hoặc GPS cá nhân.

**Actual / tester / defect:** Chưa có; chưa tự phân công.
