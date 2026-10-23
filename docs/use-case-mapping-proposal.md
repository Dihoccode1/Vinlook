# Vinlook — Đề xuất ánh xạ User Story → Use Case v1.0

Ngày: 23/10/2026. **ÁNH XẠ ĐÃ ĐƯỢC DUY DUYỆT — DEC-047**.

Cơ sở: [User Stories v1.1](user-stories.md), [PRD v1.1](PRD.md), DEC-045/046 trong [Decision Log](decision-log.md). Microservices và CI/CD phải có ngay Day 5, CD tự động khi checks và gate đã duyệt đạt. Bảng này không chọn service boundaries, data ownership, API hoặc topology.

## Cách phân rã cần xác nhận

Đề xuất **37 Use Case**: 30 luồng sản phẩm và 7 luồng setup/vận hành/nghiệm thu. ID UC dưới đây mới là mã đề xuất; chưa có main/alternative/exception flow được phê duyệt và chưa có sơ đồ.

- Tách khi actor, mục tiêu hoặc kết quả nghiệp vụ khác nhau; không tách mỗi lỗi/thao tác kỹ thuật thành Use Case riêng.
- Lệch đường, mất GPS, không có tuyến, lỗi từng ngôn ngữ, hết quota/worker ngừng là tình huống của các luồng tương ứng; không tự thêm feature mới.
- Use Case vận hành là tài liệu quy trình, không tạo thêm màn hình Admin hoặc vai trò RBAC. “Người vận hành/nhà phát triển/người phát hành” là trách nhiệm nhóm sẽ chỉ định sau; GitHub Actions là công cụ/actor hỗ trợ trong ngữ cảnh vận hành.
- Actor của luồng sản phẩm vẫn là du khách, Staff và Manager; service/provider nào tham gia là câu hỏi Design, không suy ra tên/số microservice từ số Use Case.
- REQ-027–032 và AC tương ứng áp dụng cho các luồng liên quan. Thêm microservices không làm mất offline, không thay ngưỡng hiệu năng hoặc cho phép trả phí.
- Chưa xác định quan hệ UML `include`/`extend`; sẽ giải thích khi tạo sơ đồ sau khi Use Case chi tiết được xác nhận.

## 1. Luồng sản phẩm — 30 Use Case đề xuất

| UC | Mục tiêu | Actor chính | Story nguồn | Requirement / AC gốc |
|---|---|---|---|---|
| UC-001 | Xem bản đồ và các POI công khai | Du khách | US-001 | REQ-001, REQ-014 / AC-001, AC-014 |
| UC-002 | Xem thông tin, ảnh và mô tả một POI | Du khách | US-001, US-010 | REQ-001, REQ-010, REQ-014 / AC-001, AC-010, AC-014 |
| UC-003 | Dùng vị trí hiện tại và xử lý quyền GPS | Du khách | US-002 | REQ-002, REQ-025 / AC-002, AC-025 |
| UC-004 | Xem/chọn từ các POI gần nhất | Du khách | US-003 | REQ-003 / AC-003 |
| UC-005 | Tìm kiếm và chọn POI | Du khách | US-004 | REQ-004 / AC-004 |
| UC-006 | Dẫn đường đi bộ đến một đích | Du khách | US-004, US-005, US-006 | REQ-004–007, REQ-027 / AC-004–007, AC-027 |
| UC-007 | Tải dữ liệu offline lần đầu | Du khách | US-008 | REQ-007, REQ-008, REQ-021 / AC-007, AC-008, AC-021 |
| UC-008 | Mở lại và tiếp tục dùng khi offline | Du khách | US-007, US-009 | REQ-007, REQ-009 / AC-007, AC-009 |
| UC-009 | Cập nhật gói offline đã có | Du khách | US-008, US-009 | REQ-008, REQ-009, REQ-021 / AC-008, AC-009, AC-021 |
| UC-010 | Chọn ngôn ngữ giao diện/nội dung du khách | Du khách | US-010, US-009 | REQ-009, REQ-010 / AC-009, AC-010 |
| UC-011 | Nghe thuyết minh POI theo ngôn ngữ | Du khách | US-010, US-009 | REQ-009, REQ-010, REQ-023 / AC-009, AC-010, AC-023 |
| UC-012 | Tạo/chỉnh sửa và lưu POI nháp | Staff hoặc Manager | US-014 | REQ-014, REQ-018, REQ-019 / AC-014, AC-018, AC-019 |
| UC-013 | Chủ động chạy dịch và tạo audio | Staff hoặc Manager | US-011, US-013 | REQ-011, REQ-013, REQ-018 / AC-011, AC-013, AC-018 |
| UC-014 | Thử lại phần xử lý bị lỗi/chờ khi có điều kiện | Staff hoặc Manager | US-013 | REQ-013, REQ-028 / AC-013, AC-028 |
| UC-015 | Kiểm tra và trình nội dung để duyệt công khai | Staff hoặc Manager | US-012 | REQ-012, REQ-017–019 / AC-012, AC-017–019 |
| UC-016 | Duyệt và công khai bản đủ 16 ngôn ngữ | Manager | US-012 | REQ-012, REQ-017–019 / AC-012, AC-017–019 |
| UC-017 | Đánh dấu xóa POI | Manager | US-015 | REQ-009, REQ-015, REQ-018, REQ-019 / AC-009, AC-015, AC-018, AC-019 |
| UC-018 | Khôi phục POI đã đánh dấu xóa về nháp | Manager | US-016 | REQ-015, REQ-018, REQ-019, REQ-026 / AC-015, AC-018, AC-019, AC-026 |
| UC-019 | Đăng ký nhân viên và nhận trạng thái chờ | Người đăng ký Staff | US-017, US-026 | REQ-016, REQ-021 / AC-016, AC-021 |
| UC-020 | Đăng nhập theo trạng thái/quyền tài khoản | Staff hoặc Manager | US-018 | REQ-016, REQ-017 / AC-016, AC-017 |
| UC-021 | Duyệt đăng ký để cấp quyền Staff | Manager | US-019 | REQ-016, REQ-017 / AC-016, AC-017 |
| UC-023 | Khóa/mở khóa Staff và áp dụng quyền mới | Manager | US-021 | REQ-017 / AC-017 |
| UC-024 | Mở hoặc mở lại phiên làm việc cùng ngày | Staff hoặc Manager | US-022 | REQ-018 / AC-018 |
| UC-025 | Đóng phiên làm việc | Staff hoặc Manager; tự đóng theo giờ là quy tắc hệ thống | US-022 | REQ-018 / AC-018 |
| UC-026 | Xem lịch sử phiên theo quyền | Staff hoặc Manager | US-023 | REQ-019 / AC-019 |
| UC-027 | Xác minh Staff và cấp mã khôi phục | Manager | US-024 | REQ-020 / AC-020 |
| UC-028 | Dùng mã khôi phục để đặt mật khẩu mới | Staff đang khôi phục truy cập | US-024 | REQ-020 / AC-020 |
| UC-030 | Xem số khách online hiện tại | Staff hoặc Manager | US-027 | REQ-022 / AC-022 |
| UC-031 | Xem số người trong phiên nghe hiện tại | Staff hoặc Manager | US-028 | REQ-022, REQ-023 / AC-022, AC-023 |
| UC-032 | Xem sức khỏe phụ thuộc và trạng thái xử lý nội dung | Staff hoặc Manager | US-029, US-026 | REQ-021, REQ-024 / AC-021, AC-024 |

UC-005 vẫn tìm/xem được POI khi không cấp GPS; cần GPS khi chuyển sang yêu cầu tuyến UC-006. UC-006 giữ tính lại khi lệch, mất GPS và không có tuyến trong alternative/exception flow, gồm cả trường hợp offline với dữ liệu đầy đủ. UC-008 là mục tiêu tiếp tục sử dụng không mạng, sẽ dẫn chiếu các luồng tương ứng thay vì tự tạo bộ chức năng du lịch khác.

UC-012 giữ tạo/sửa cùng mục tiêu chuẩn bị bản nháp; UC-023 giữ khóa/mở cùng mục tiêu thay đổi trạng thái Staff. Các biến thể này không được tự coi là những màn hình/API riêng. Tách thêm nếu có nhu cầu sẽ trình lại, không tự tăng số UC.

## 2. Setup, vận hành và nghiệm thu — 7 Use Case đề xuất

Các luồng này thuộc ngữ cảnh vận hành dự án, không phải chức năng du khách và không mặc nhiên nằm trong system boundary của sơ đồ sản phẩm.

| UC | Mục tiêu | Actor/chủ thể khởi phát | Story nguồn | Requirement / AC gốc |
|---|---|---|---|---|
| UC-022 | Thiết lập Manager đầu tiên | Người vận hành được chỉ định | US-020 | REQ-016, REQ-029 / AC-016, AC-029 |
| UC-029 | Khôi phục quyền truy cập Manager theo quy trình | Người vận hành được chỉ định | US-025 | REQ-020 / AC-020 |
| UC-033 | Tạo bản sao database và ảnh/audio đã duyệt | Người vận hành được chỉ định | US-031 | REQ-026 / AC-026 |
| UC-034 | Thử phục hồi từ bản sao và kiểm chứng kết quả | Người vận hành được chỉ định | US-031 | REQ-026 / AC-026 |
| UC-035 | Chạy kiểm tra/test/build service qua CI | Nhà phát triển khởi phát theo trigger đã duyệt; GitHub Actions thực thi | US-035, US-036 | REQ-028, REQ-029, REQ-031, REQ-032 / AC-028, AC-029, AC-031, AC-032 |
| UC-036 | Triển khai service tự động khi checks/gate đạt | Trigger phát hành đã duyệt; GitHub Actions/hosting thực thi | US-035, US-036 | REQ-028–032 / AC-028–032 |
| UC-037 | Xét bằng chứng và nghiệm thu checkpoint | Duy | US-034 | REQ-030 / AC-030 |

UC-035/036 không mặc định mỗi push/merge đều deploy Production. Chế độ tự động đã chốt, nhưng trigger, checks, điều kiện release, artifact, rollback và nơi triển khai vẫn cần Design được duyệt. Không thêm bước duyệt tay từng deploy trái lựa chọn 2B; vẫn giữ gate Waterfall và phê duyệt release/phase có liên quan.

UC-037 là quy trình xét bản chạy và evidence, không thêm portal nghiệm thu vào ứng dụng. Chưa tự đặt Critical/Blocker classification, checklist chi tiết hoặc assignee cho các luồng vận hành.

## 3. Vì sao một story được đề xuất tách thành nhiều Use Case?

| Story | Đề xuất | Lý do |
|---|---|---|
| US-001 | UC-001 và UC-002 | Xem toàn bản đồ/tập POI khác mục tiêu đọc thông tin một điểm được chọn; không thêm tính năng ngoài PRD. |
| US-008 | UC-007 và UC-009 | Tải lần đầu chưa có gói dự phòng; cập nhật có quy tắc giữ gói cũ đến khi bản mới đủ. Trigger/điều kiện trước khác nhau. |
| US-010 | UC-010 và UC-011; phần xem POI tại UC-002 | Chọn ngôn ngữ để đọc/UI không bắt buộc nghe; nghe có thao tác Play và vòng đời riêng. |
| US-012 | UC-015 và UC-016 | Kiểm tra/trình có thể do Staff; công khai chỉ Manager và cần đủ 16 ngôn ngữ. Actor/quyền/kết quả khác nhau. Manager được tự duyệt bản mình sửa vẫn giữ nguyên. |
| US-013 | UC-013 và UC-014 | Chạy lần đầu và chủ động thử lại phần lỗi có điều kiện đầu vào khác; worker tắt/quota hết vẫn là tình huống chờ/lỗi, không tạo UC riêng cho từng provider. |
| US-022 | UC-024 và UC-025 | Mở/mở lại nhằm cho phép làm việc; đóng kết thúc phiên. Tự đóng 00:00 là quy tắc của vòng đời, không tạo actor tài khoản mới. |
| US-024 | UC-027 và UC-028 | Manager xác minh/cấp khả năng khôi phục; Staff dùng mã đặt mật khẩu mới. Hai actor và hai kết quả. |
| US-031 | UC-033 và UC-034 | Có bản sao khác với chứng minh bản sao khôi phục được; PRD yêu cầu cả hai và cần evidence riêng. |
| US-035/036 | UC-035 và UC-036, kèm ràng buộc kiến trúc | CI kiểm tra/build khác CD phát hành sau khi đủ điều kiện. Chứng minh service độc lập là điều kiện của các luồng này, không tự chọn số service. |

Không yêu cầu duyệt lại những quy tắc nghiệp vụ đã chốt; cần Duy xác nhận **cách phân rã và phân loại** trước khi tạo đặc tả Use Case.

## 4. Story về chất lượng/quy tắc dùng chung

| Story | Cách truy vết được đề xuất |
|---|---|
| US-006 | Alternative/exception flow của UC-006; điều kiện GPS liên quan UC-003. Không tạo màn hình lỗi độc lập thành tính năng mới. |
| US-009 | Quy tắc chuyển offline/ngôn ngữ tại UC-008/010/011 và đồng bộ dữ liệu tại UC-001/004/005/009. Không tự quyết định ngôn ngữ khi có mạng trở lại hoặc hành vi đích bị xóa. |
| US-026 | Trạng thái được hiển thị trong UC-007/009/013/014/019/021/032 theo quyền; không thêm hộp thông báo lưu trữ mới. |
| US-030 | REQ-025/AC-025 là quy tắc riêng tư trong UC-003/006/030/031 và kiểm tra dữ liệu; không thêm màn hình “theo dõi vị trí từng khách”. |
| US-032 | REQ-027/AC-027 là điều kiện hiệu năng của UC-001/004/005/006/011, gồm giới hạn tải đã chốt; không thêm thao tác “chạy benchmark” cho du khách. |
| US-033 | REQ-028/029 và AC tương ứng ràng buộc vận hành toàn hệ thống; tình huống quota tại UC-013/014, cấu hình/release tại UC-035/036. Không thêm trang thanh toán. |

Các liên kết này giữ traceability US → UC/flow → AC, không bỏ yêu cầu hoặc tự gọi yêu cầu chất lượng là một feature mới.

## 5. Ma trận bao phủ đủ 36 story

| Story | UC đề xuất / vai trò của liên kết |
|---|---|
| US-001 | UC-001, UC-002 |
| US-002 | UC-003 |
| US-003 | UC-004 |
| US-004 | UC-005, UC-006; tìm/chọn đích và dẫn đến đích |
| US-005 | UC-006; offline tương ứng UC-008 |
| US-006 | UC-003, UC-006; xử lý lỗi/ngoại lệ |
| US-007 | UC-008, áp dụng các luồng du lịch UC-001–006/010/011 khi offline |
| US-008 | UC-007, UC-009 |
| US-009 | UC-008/010/011 và đồng bộ tại UC-001/004/005/009 |
| US-010 | UC-002, UC-010, UC-011 |
| US-011 | UC-013 |
| US-012 | UC-015, UC-016 |
| US-013 | UC-013, UC-014; trạng thái tại UC-032 |
| US-014 | UC-012 |
| US-015 | UC-017; đồng bộ xóa ở các luồng du khách liên quan |
| US-016 | UC-018; khi công khai lại tuân thủ UC-015/016 |
| US-017 | UC-019 |
| US-018 | UC-020 |
| US-019 | UC-021 |
| US-020 | UC-022; vận hành/setup |
| US-021 | UC-023 |
| US-022 | UC-024, UC-025 |
| US-023 | UC-026 |
| US-024 | UC-027, UC-028 |
| US-025 | UC-029; vận hành |
| US-026 | Quy tắc trạng thái tại UC-007/009/013/014/019/021/032 |
| US-027 | UC-030 |
| US-028 | UC-031 |
| US-029 | UC-032 |
| US-030 | Quy tắc riêng tư UC-003/006/030/031 |
| US-031 | UC-033, UC-034; vận hành |
| US-032 | Hiệu năng UC-001/004/005/006/011 |
| US-033 | Miễn phí/cấu hình chung; quota UC-013/014, CI/CD UC-035/036 |
| US-034 | UC-037; quy trình nghiệm thu, không thêm UI |
| US-035 | UC-035/036 và AC-031 về khả năng chạy/phát hành service riêng |
| US-036 | UC-035, UC-036; vận hành CI/CD |

## Gate xác nhận

Đề nghị Duy duyệt 37 UC được đề xuất, các chỗ một story tách nhiều UC và cách gắn quy tắc dùng chung/vận hành ở trên. Sau xác nhận, mới tạo đặc tả từng UC gồm actor/goal/trigger/preconditions/postconditions/main/alternative/exception flow/business rules/AC và liên kết nguồn. Đây chưa phải phê duyệt các flow chi tiết hoặc sơ đồ/kiến trúc.

Đặc tả chi tiết được soạn tại [Use Cases](use-cases.md), có trạng thái review riêng.
