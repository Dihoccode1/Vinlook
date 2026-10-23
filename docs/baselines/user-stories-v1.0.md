# Vinlook — User Stories v1.0

Ngày: 23/10/2026. **US-001–US-034 ĐÃ ĐƯỢC DUY DUYỆT**, DEC-045.

Nguồn: [PRD v1.0 đã duyệt](PRD-v1.0.md), DEC-044 trong [Decision Log](../decision-log.md). Tài liệu chuyển yêu cầu thành mục tiêu người dùng; chưa phải Use Case, backlog, phân công, thiết kế hoặc Test Case. Không tạo GitHub Issue/PR trong bước này.

## Quy ước áp dụng

- Tất cả story có **Priority: Must-have** theo PRD; thứ tự ID không là thứ tự ưu tiên, triển khai hoặc milestone. Phụ thuộc là điều kiện nghiệp vụ, không tự assign người hoặc khóa lịch.
- Mỗi story có Description theo As a / I want / So that, Preconditions, Dependency, Business Rule và Acceptance Criteria. Các REQ/FEAT/AC được dẫn chiếu đều thuộc PRD; toàn bộ AC gốc liên quan vẫn có hiệu lực, các tình huống dưới đây giúp diễn đạt theo góc nhìn người dùng, không thay hoặc giảm điều kiện PRD.
- Mỗi tình huống Given/When/Then trong một story được gọi là S1, S2… theo thứ tự xuất hiện, có thể dẫn chiếu bằng `US-xxx/S1` ở bước kiểm thử sau. Đây không phải Use Case đã tách.
- Quy tắc dùng chung: REQ-027/AC-027 (hiệu năng), REQ-028/AC-028 (miễn phí), REQ-029/AC-029 (stack/môi trường/công cụ đã duyệt) và REQ-030/AC-030 (gates/checkpoint) áp dụng theo phạm vi hoạt động tương ứng. Những yêu cầu này không bị bỏ qua nếu không được lặp trong từng story.
- Vai trò "người vận hành của nhóm" dưới đây là người thực hiện setup/backup/phục hồi được chỉ định sau; không phải vai trò RBAC sản phẩm mới, không tự gán cho thành viên cụ thể.
- Các lựa chọn còn mở tại mục 8 PRD vẫn chờ Design, gồm engine offline, schema/API, tổng dung lượng, bảo mật, quota/voice và cách phục hồi. Chưa có bằng chứng ứng dụng chạy hoặc đạt AC.

## Du khách — khám phá, dẫn đường và nội dung

### US-001 — Xem bản đồ và POI không cần tài khoản

- **Liên kết:** REQ-001, REQ-014; FEAT-001, FEAT-004; AC-001, AC-014. **Priority:** Must-have.
- **Description:** As a du khách, I want xem bản đồ và thông tin POI mà không đăng nhập, So that tôi có thể bắt đầu khám phá thành phố.
- **Preconditions:** Có dữ liệu công khai hợp lệ; online hoặc có gói offline đủ theo US-007.
- **Dependency:** US-014 cung cấp dữ liệu; US-012 cung cấp bản công khai. Đây không phải yêu cầu phải phát triển UI sau Admin.
- **Business Rule:** Toàn TP.HCM theo ranh giới hiện tại; 15 POI ban đầu; Chrome Android/Safari iPhone; du khách chỉ đọc bản công khai.
- **Acceptance Criteria S1:** Given dữ liệu 15 POI đã công khai, When khách mở bản đồ không đăng nhập, Then xem được bản đồ và thông tin/ảnh POI tương ứng trên hai họ trình duyệt, phạm vi không thu hẹp về nội thành cũ.

### US-002 — Dùng vị trí hiện tại và xử lý quyền GPS

- **Liên kết:** REQ-002, REQ-025; FEAT-001, FEAT-002; AC-002, AC-025. **Priority:** Must-have.
- **Description:** As a du khách, I want dùng vị trí hiện tại khi cấp quyền GPS, So that tôi định hướng và dùng các chức năng gần mình.
- **Preconditions:** Mở Vinlook trên thiết bị hỗ trợ vị trí.
- **Dependency:** US-001; quyền GPS và vị trí khả dụng khi gọi chức năng theo vị trí.
- **Business Rule:** Không cấp quyền vẫn xem bản đồ/tìm POI/nghe/tải; gợi ý theo vị trí và dẫn đường cần GPS; không lưu lịch sử di chuyển.
- **Acceptance Criteria S1:** Given đã cấp quyền và có GPS, When lấy vị trí, Then bản đồ hiển thị vị trí hiện tại.
- **Acceptance Criteria S2:** Given từ chối GPS, When dùng app, Then các chức năng không cần GPS vẫn dùng được; khi gọi gợi ý theo vị trí/dẫn đường thì được thông báo điều kiện GPS.

### US-003 — Chọn trong các POI gần nhất

- **Liên kết:** REQ-003; FEAT-001; AC-003. **Priority:** Must-have.
- **Description:** As a du khách, I want xem các POI gần mình, So that tôi chọn điểm phù hợp để đi bộ tới.
- **Preconditions:** Có vị trí và tập POI công khai phù hợp dữ liệu đang sử dụng.
- **Dependency:** US-001, US-002; US-007 nếu offline.
- **Business Rule:** Tối đa 4 điểm gần nhất trong 3 km đường thẳng; không tự mở rộng bán kính.
- **Acceptance Criteria S1:** Given hơn 4 POI đủ điều kiện, When xem gợi ý, Then nhận 4 điểm gần nhất đúng thứ tự khoảng cách.
- **Acceptance Criteria S2:** Given chỉ có 0–3 POI đủ điều kiện, When xem gợi ý, Then hiển thị đúng số tìm được, không bù điểm ngoài 3 km.

### US-004 — Tìm và chọn một POI làm đích

- **Liên kết:** REQ-004; FEAT-001, FEAT-002; AC-004. **Priority:** Must-have.
- **Description:** As a du khách, I want tìm POI hoặc chọn từ gợi ý làm đích, So that tôi đi tới đúng nơi muốn tham quan.
- **Preconditions:** Có POI công khai trong dữ liệu đang dùng; cần GPS để yêu cầu tuyến.
- **Dependency:** US-001, US-003 cho luồng gợi ý; US-005 cho dẫn đường.
- **Business Rule:** Một đích mỗi lần; 3 km là giới hạn gợi ý đường thẳng, không giới hạn chiều dài tuyến đi bộ.
- **Acceptance Criteria S1:** Given một POI có thể tiếp cận trong dữ liệu, When tìm và chọn hoặc chọn từ gợi ý, Then đích dẫn đường là đúng POI đó; không yêu cầu tạo hành trình nhiều điểm.

### US-005 — Đi bộ theo chỉ dẫn và tính lại khi lệch

- **Liên kết:** REQ-005, REQ-007; FEAT-002; AC-005, AC-007. **Priority:** Must-have.
- **Description:** As a du khách, I want được hướng dẫn đi bộ và tính lại tuyến khi đi lệch, So that tôi tiếp tục đến POI khi online hoặc offline.
- **Preconditions:** GPS khả dụng, có đích, dữ liệu cần thiết và tuyến đi bộ hợp lệ.
- **Dependency:** US-002, US-004; US-007 nếu offline; engine/graph cần kiểm chứng trong Design.
- **Business Rule:** Chỉ dẫn chữ/hình khi màn hình Vinlook mở; không yêu cầu giọng nói hoặc hoạt động nền.
- **Acceptance Criteria S1:** Given có tuyến hợp lệ, When khách di chuyển rồi lệch tuyến, Then vị trí/chỉ dẫn cập nhật và tuyến được tính lại; thực hiện được cả khi ngắt Internet với gói đầy đủ, trong ngưỡng AC-027.

### US-006 — Nhận hướng xử lý khi thiếu GPS hoặc không có tuyến

- **Liên kết:** REQ-006; FEAT-002; AC-006. **Priority:** Must-have.
- **Description:** As a du khách, I want biết vì sao dẫn đường không tiếp tục, So that tôi thử lại hoặc chọn điểm khác.
- **Preconditions:** Đang yêu cầu tuyến hoặc đang dẫn đường.
- **Dependency:** US-005; không tự chọn tham số phát hiện lỗi hoặc engine tại đây.
- **Business Rule:** Không có tuyến thì báo và cho thử lại/chọn POI khác; mất GPS giữ tuyến/vị trí cuối nhưng báo không khả dụng.
- **Acceptance Criteria S1:** Given không tìm được tuyến, When nhận kết quả, Then thấy thông báo và có thể thử lại/chọn điểm khác.
- **Acceptance Criteria S2:** Given đang dẫn đường rồi mất GPS, When GPS mất và sau đó trở lại, Then giữ thông tin cuối với trạng thái mất GPS, không giả làm vị trí hiện tại, rồi tiếp tục cập nhật khi có GPS.

### US-007 — Mở lại và sử dụng khi hoàn toàn offline

- **Liên kết:** REQ-007; FEAT-001, FEAT-002, FEAT-003, FEAT-004; AC-007. **Priority:** Must-have.
- **Description:** As a du khách, I want mở lại Vinlook và dùng các chức năng du lịch khi mất Internet, So that chuyến tham quan không phụ thuộc kết nối liên tục.
- **Preconditions:** Đã chuẩn bị/tải đủ dữ liệu khi online; GPS và quyền khả dụng cho chức năng cần vị trí.
- **Dependency:** US-008; các luồng US-001–005, US-010; phương án offline được duyệt trong Design.
- **Business Rule:** Giao diện/text/audio offline tiếng Anh; bản đồ toàn phạm vi đã chốt, POI/ảnh, tìm/gợi ý, GPS, tính/tính lại đường và audio phải dùng được.
- **Acceptance Criteria S1:** Given đã tải đủ, When đóng app, ngắt Internet và mở lại, Then hoàn tất các luồng nêu trên trên hai họ thiết bị/trình duyệt đã chọn, không gọi backend để hoàn thành chức năng offline.

### US-008 — Tải dữ liệu và cập nhật an toàn

- **Liên kết:** REQ-008, REQ-007, REQ-021; FEAT-001, FEAT-002, FEAT-003, FEAT-004; AC-008, AC-007, AC-021. **Priority:** Must-have.
- **Description:** As a du khách, I want chủ động tải và cập nhật dữ liệu offline, So that tôi biết khi nào ứng dụng đủ dữ liệu để dùng không có mạng.
- **Preconditions:** Online, có gói được cung cấp; có thể đã có gói cũ.
- **Dependency:** Dữ liệu công khai US-012/014; phương án đóng gói/phân phối/lưu trữ tại Design.
- **Business Rule:** Báo bản mới để khách chủ động tải; chỉ báo ready khi đủ; giữ bản cũ đến khi bản mới hoàn chỉnh.
- **Acceptance Criteria S1:** Given có bản mới, When khách bắt đầu tải và tải đủ, Then ứng dụng mới báo hoàn tất và dùng bản thay thế.
- **Acceptance Criteria S2:** Given có gói cũ, When cập nhật bị ngắt/lỗi, Then gói cũ còn dùng được, có trạng thái chưa hoàn tất và có thể thử lại; không báo ready cho phần tải thiếu.

### US-009 — Chuyển sang tiếng Anh và cập nhật trạng thái xóa khi có mạng

- **Liên kết:** REQ-009; FEAT-001, FEAT-002, FEAT-003, FEAT-004; AC-009. **Priority:** Must-have.
- **Description:** As a du khách, I want dữ liệu sử dụng phù hợp trạng thái kết nối, So that tôi tiếp tục dùng nội dung đã tải và nhận trạng thái POI khi đồng bộ được.
- **Preconditions:** Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.
- **Dependency:** US-007, US-010, US-015; cơ chế đồng bộ tại Design.
- **Business Rule:** Mất mạng chuyển UI/text sang Anh, báo offline, dừng audio ngôn ngữ khác; khách bấm Play để nghe Anh. Trạng thái xóa chỉ truyền tới máy mất mạng khi kết nối/đồng bộ lại.
- **Acceptance Criteria S1:** Given đang dùng ngôn ngữ khác, When mất mạng, Then thực hiện đúng chuyển đổi trên và không tự phát audio Anh.
- **Acceptance Criteria S2:** Given gói cũ còn POI đã xóa trên server, When kết nối và đồng bộ trạng thái xóa, Then POI bị ẩn khỏi bản đồ/tìm/gợi ý. Cách khôi phục lựa chọn ngôn ngữ khi có mạng và xử lý đích đang dẫn bị xóa vẫn chờ duyệt trong Design.

### US-010 — Xem và nghe thuyết minh theo ngôn ngữ

- **Liên kết:** REQ-010; FEAT-003; AC-010. **Priority:** Must-have.
- **Description:** As a du khách, I want chọn ngôn ngữ rồi chủ động nghe thuyết minh POI, So that tôi hiểu thông tin địa điểm bằng ngôn ngữ phù hợp.
- **Preconditions:** POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.
- **Dependency:** US-012, US-014; US-007 khi offline.
- **Business Rule:** Online đúng 16 ngôn ngữ/biến thể tại PRD mục 5, áp dụng UI/text/audio; bài đọc 90–150 giây. Offline chỉ Anh, không tự phát theo GPS/chọn POI.
- **Acceptance Criteria S1:** Given online, When khách lần lượt chọn từng ngôn ngữ và bấm Play, Then UI/mô tả/audio đúng ngôn ngữ/biến thể và audio đúng thời lượng; chọn POI mà chưa Play không phát.

## Staff/Manager — nội dung và vòng đời POI

### US-011 — Chủ động tạo bản dịch và audio

- **Liên kết:** REQ-011; FEAT-003, FEAT-005; AC-011. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want chủ động xử lý mô tả tiếng Anh đã chỉnh sửa, So that tôi tạo nội dung đa ngôn ngữ khi sẵn sàng.
- **Preconditions:** Tài khoản có quyền, online, phiên làm việc mở và có nguồn tiếng Anh.
- **Dependency:** US-014, US-018, US-022; provider/worker đúng lựa chọn được duyệt.
- **Business Rule:** Sửa/lưu không tự chạy pipeline; xử lý không tự công khai.
- **Acceptance Criteria S1:** Given sửa/lưu nguồn, When chưa bấm xử lý, Then pipeline chưa tự chạy; When người có quyền chủ động chạy, Then công việc dịch/audio được thực hiện và có trạng thái để theo dõi.

### US-012 — Kiểm tra, trình duyệt và công khai nội dung đủ ngôn ngữ

- **Liên kết:** REQ-012, REQ-017; FEAT-003, FEAT-004, FEAT-005; AC-012, AC-017. **Priority:** Must-have.
- **Description:** As a Staff chuẩn bị hoặc Manager duyệt nội dung, I want kiểm tra và đưa bản đủ điều kiện ra công khai, So that khách chỉ dùng nội dung đã chịu trách nhiệm phê duyệt.
- **Preconditions:** Online, phiên mở và có bản cần kiểm tra/duyệt.
- **Dependency:** US-011, US-014, US-018, US-022.
- **Business Rule:** Staff kiểm tra/trình duyệt; Manager công khai đủ text/audio đã duyệt cho cả 16 ngôn ngữ, được duyệt bản mình sửa. Bản công khai cũ tiếp tục phục vụ khi bản mới đang chờ.
- **Acceptance Criteria S1:** Given còn thiếu bất kỳ ngôn ngữ/đầu ra/phê duyệt nào, When yêu cầu công khai, Then bản mới chưa được công khai và bản cũ còn phục vụ.
- **Acceptance Criteria S2:** Given đầy đủ điều kiện, When Manager duyệt/công khai, Then khách nhận bản mới; quyền Staff không thực hiện được thao tác công khai, kể cả gọi trực tiếp chức năng tương ứng.

### US-013 — Tiếp tục xử lý sau lỗi, thiếu quota hoặc worker ngừng

- **Liên kết:** REQ-013, REQ-028; FEAT-003, FEAT-005; AC-013, AC-028. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want giữ kết quả tốt và thử lại phần xử lý còn lỗi, So that tôi hoàn thành nội dung khi dịch vụ khả dụng trở lại.
- **Preconditions:** Có công việc đang xử lý/chờ/lỗi; thao tác chủ động cần quyền, online và phiên mở.
- **Dependency:** US-011, US-012, US-029.
- **Business Rule:** Worker MMS tắt thì chờ; quota hết thì dừng và báo nguyên nhân; không nâng cấp trả phí, không công khai từng phần.
- **Acceptance Criteria S1:** Given một phần đã thành công và phần khác lỗi/chờ quota/worker, When theo dõi và thử lại lúc có điều kiện, Then giữ kết quả tốt, xử lý tiếp phần cần thiết, không bỏ qua cổng duyệt hoặc làm gián đoạn bản công khai cũ.

### US-014 — Soạn và lưu dữ liệu POI ở bản nháp

- **Liên kết:** REQ-014, REQ-018; FEAT-004, FEAT-005; AC-014, AC-018. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want thêm/chỉnh sửa dữ liệu POI trong bản nháp, So that tôi chuẩn bị thông tin mà khách chưa phải dùng bản sửa chưa duyệt.
- **Preconditions:** Có quyền, online, phiên mở; có dữ liệu đầu vào phù hợp.
- **Dependency:** US-018, US-022; cấu trúc dữ liệu phải được duyệt tại Design.
- **Business Rule:** Thông tin/tọa độ/thumbnail, text/audio theo ngôn ngữ, bản nháp/công khai; không có bán kính riêng mỗi POI. Điểm Củ Chi ban đầu là Bến Dược.
- **Acceptance Criteria S1:** Given một POI mới hoặc đã công khai, When thêm/sửa và lưu, Then dữ liệu đọc lại được, bản nháp tách khỏi bản công khai và khách chưa nhận bản sửa trước US-012; thao tác được ghi nhật ký.

### US-015 — Đánh dấu xóa POI

- **Liên kết:** REQ-015, REQ-009; FEAT-004, FEAT-005; AC-015, AC-009. **Priority:** Must-have.
- **Description:** As a Manager, I want đánh dấu POI là đã xóa, So that ngừng phục vụ điểm đó nhưng vẫn giữ khả năng khôi phục.
- **Preconditions:** Manager có quyền, online, phiên mở, POI tồn tại.
- **Dependency:** US-014, US-022, US-023; US-009 cho đồng bộ khách.
- **Business Rule:** Chỉ Manager; giữ bản ghi, không xóa vật lý.
- **Acceptance Criteria S1:** Given POI đang phục vụ, When Manager đánh dấu xóa, Then bản ghi còn tồn tại, thao tác có nhật ký và POI bị ẩn sau đồng bộ; Staff bị từ chối. Máy hoàn toàn mất mạng có thể còn gói cũ đến khi đồng bộ.

### US-016 — Khôi phục POI về nháp

- **Liên kết:** REQ-015, REQ-026; FEAT-004, FEAT-005; AC-015, AC-026. **Priority:** Must-have.
- **Description:** As a Manager, I want khôi phục POI đã đánh dấu xóa, So that tôi chuẩn bị lại điểm đó để xét duyệt phục vụ khách.
- **Preconditions:** POI đã xóa logic và dữ liệu cần phục hồi còn giữ; Manager online, phiên mở.
- **Dependency:** US-015, US-012, US-022, US-031.
- **Business Rule:** Khôi phục về nháp, cần duyệt lại đủ 16 ngôn ngữ trước công khai.
- **Acceptance Criteria S1:** Given một POI đã xóa logic, When Manager khôi phục, Then dữ liệu trở về nháp và có nhật ký, chưa tự xuất hiện như POI công khai; Staff không khôi phục được.

## Nhân viên — tài khoản, phiên và thông tin hoạt động

### US-017 — Đăng ký tài khoản nhân viên

- **Liên kết:** REQ-016; FEAT-005; AC-016. **Priority:** Must-have.
- **Description:** As a người muốn làm Staff, I want đăng ký tài khoản, So that tôi được Manager xét quyền làm việc.
- **Preconditions:** Online, chưa được cấp quyền Staff cho đăng ký này.
- **Dependency:** US-019; cơ chế xác thực thuộc Design.
- **Business Rule:** Họ tên, email, mật khẩu và xác nhận mật khẩu; phải chờ duyệt.
- **Acceptance Criteria S1:** Given nhập đủ thông tin với xác nhận mật khẩu khớp, When đăng ký thành công, Then tài khoản chờ duyệt, chưa có quyền Staff; xác nhận không khớp bị từ chối.

### US-018 — Đăng nhập với quyền được cấp

- **Liên kết:** REQ-016, REQ-017; FEAT-005; AC-016, AC-017. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want đăng nhập bằng email và mật khẩu, So that tôi truy cập đúng công việc được phép.
- **Preconditions:** Online, có tài khoản tương ứng.
- **Dependency:** US-019 hoặc US-020 cho cấp quyền ban đầu; cơ chế JWT/RBAC ở Design.
- **Business Rule:** Tài khoản chờ hoặc khóa không nhận quyền Staff đang hoạt động; hai vai trò đúng ma trận PRD.
- **Acceptance Criteria S1:** Given tài khoản đã duyệt/khả dụng và thông tin đúng, When đăng nhập, Then dùng được chức năng theo vai trò; tài khoản chờ/khóa không truy cập được chức năng Staff/Manager trái quyền.

### US-019 — Xét duyệt đăng ký nhân viên

- **Liên kết:** REQ-016, REQ-017; FEAT-005; AC-016, AC-017. **Priority:** Must-have.
- **Description:** As a Manager, I want xét duyệt đăng ký nhân viên, So that chỉ người được chấp thuận được làm Staff.
- **Preconditions:** Manager online và được xác thực; có đăng ký chờ.
- **Dependency:** US-017, US-020; không tự thêm yêu cầu phiên mở cho quản trị tài khoản chưa được chốt.
- **Business Rule:** Chỉ Manager cấp quyền từ đăng ký; không tự gán người phát triển làm Staff/Manager.
- **Acceptance Criteria S1:** Given đăng ký đang chờ, When Manager phê duyệt, Then tài khoản dùng quyền Staff khi đăng nhập; Staff không thực hiện được thao tác phê duyệt.

### US-020 — Thiết lập Manager đầu tiên

- **Liên kết:** REQ-016; FEAT-005; AC-016. **Priority:** Must-have.
- **Description:** As a người vận hành của nhóm, I want thiết lập Manager đầu tiên, So that hệ thống có người xét duyệt đăng ký và công khai nội dung.
- **Preconditions:** Môi trường được thiết lập; quy trình setup và người thực hiện cần được duyệt.
- **Dependency:** Design xác thực/setup; chưa chọn lệnh, script hoặc thông tin bí mật trong story.
- **Business Rule:** Tạo trong setup; chưa gán một thành viên cụ thể vào tài khoản sản phẩm.
- **Acceptance Criteria S1:** Given môi trường ban đầu, When thực hiện quy trình setup được duyệt, Then có Manager đăng nhập và phê duyệt nhân viên được; không giả định người đăng ký công khai đầu tiên mặc nhiên thành Manager.

### US-021 — Khóa hoặc mở khóa Staff

- **Liên kết:** REQ-017; FEAT-005; AC-017. **Priority:** Must-have.
- **Description:** As a Manager, I want khóa/mở tài khoản Staff, So that kiểm soát quyền làm việc mà vẫn bảo toàn lịch sử.
- **Preconditions:** Manager xác thực online, tài khoản Staff tồn tại.
- **Dependency:** US-018, US-023; cơ chế thu hồi phiên phải duyệt tại Design.
- **Business Rule:** Khóa tác động cả phiên đăng nhập hiện có; không xóa lịch sử công việc.
- **Acceptance Criteria S1:** Given Staff đang đăng nhập, When Manager khóa, Then Staff không tiếp tục thao tác bằng phiên hiện tại; When được mở khóa, Then có thể truy cập lại theo xác thực/quyền, lịch sử trước đó còn nguyên.

### US-022 — Làm việc trong một phiên hằng ngày

- **Liên kết:** REQ-018; FEAT-005; AC-018. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want mở/đóng và mở lại phiên trong ngày, So that công việc nội dung được ghi đúng phiên của mình.
- **Preconditions:** Xác thực online, có quyền tương ứng.
- **Dependency:** US-018; không phải phụ thuộc phải có POI mới mở được phiên.
- **Business Rule:** Một phiên/người/ngày, giờ Việt Nam; mở trước thay đổi nội dung, xử lý và xét duyệt nội dung; đóng tay hoặc 00:00; mở lại cùng phiên cùng ngày.
- **Acceptance Criteria S1:** Given chưa có phiên mở, When gọi thao tác nội dung liên quan, Then chưa được thực hiện; When mở phiên hợp lệ, Then thực hiện theo quyền.
- **Acceptance Criteria S2:** Given phiên đã đóng tay cùng ngày, When mở lại, Then dùng cùng phiên; phiên còn mở tự đóng lúc 00:00, không tạo hai phiên cho một người cùng ngày.

### US-023 — Xem nhật ký phiên theo quyền

- **Liên kết:** REQ-019; FEAT-005; AC-019. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want xem lịch sử phiên theo quyền, So that biết ai đã thực hiện các thay đổi POI và kết quả.
- **Preconditions:** Xác thực online, có lịch sử thao tác để đọc.
- **Dependency:** US-022 và các thao tác US-011–016 để phát sinh lịch sử.
- **Business Rule:** Ghi người, thời điểm, thao tác, POI và kết quả; Staff xem mình, Manager xem toàn bộ.
- **Acceptance Criteria S1:** Given thao tác thuộc phiên đã phát sinh, When người dùng xem lịch sử, Then thông tin khớp người/phiên/POI/kết quả, Staff không đọc lịch sử người khác, Manager đọc được theo quyền.

### US-024 — Khôi phục mật khẩu Staff sau xác minh

- **Liên kết:** REQ-020; FEAT-005; AC-020. **Priority:** Must-have.
- **Description:** As a Staff quên mật khẩu, I want được Manager xác minh và cấp khả năng đặt lại mật khẩu, So that lấy lại quyền truy cập tài khoản của mình.
- **Preconditions:** Manager xác minh đúng nhân viên; online ở các bước thực hiện trên hệ thống.
- **Dependency:** US-018; cơ chế xác minh/cấp mã/hạn dùng/lưu bảo mật phải duyệt ở Design.
- **Business Rule:** Staff tự đặt mật khẩu mới bằng mã có hạn, dùng một lần; không tự thêm email/SMS tự động.
- **Acceptance Criteria S1:** Given mã đúng và còn hiệu lực sau xác minh, When Staff đặt mật khẩu mới, Then có thể đăng nhập với mật khẩu mới; mã đã dùng hoặc hết hạn không đặt lại được lần nữa.

### US-025 — Khôi phục quyền truy cập Manager

- **Liên kết:** REQ-020; FEAT-005; AC-020. **Priority:** Must-have.
- **Description:** As a người vận hành được chỉ định, I want khôi phục quyền truy cập Manager qua quy trình được duyệt, So that hệ thống có thể tiếp tục quản trị khi Manager mất quyền truy cập.
- **Preconditions:** Có trường hợp mất truy cập cần xử lý và quy trình đã được Duy duyệt.
- **Dependency:** Design quy trình vận hành/bảo mật; US-020 cung cấp Manager ban đầu.
- **Business Rule:** Không tự thêm tài khoản cửa hậu hoặc vai trò sản phẩm mới; chưa chọn thao tác kỹ thuật ở đây.
- **Acceptance Criteria S1:** Given tình huống mất truy cập Manager được kiểm tra, When người được chỉ định thực hiện quy trình đã duyệt, Then Manager lấy lại khả năng đăng nhập/quản trị và có bằng chứng thực hiện đúng quy trình.

### US-026 — Đọc trạng thái công việc trong ứng dụng

- **Liên kết:** REQ-021; FEAT-003, FEAT-005 và chức năng offline; AC-021. **Priority:** Must-have.
- **Description:** As a người dùng trong luồng liên quan, I want xem trạng thái tài khoản/xử lý nội dung/cập nhật dữ liệu ngay trong ứng dụng, So that biết việc đang chờ, hoàn tất hoặc cần thử lại.
- **Preconditions:** Đang truy cập luồng tương ứng, theo đúng quyền và điều kiện mạng của luồng.
- **Dependency:** US-008, US-011, US-013, US-017, US-019.
- **Business Rule:** Chỉ trạng thái trong app, không email/SMS/push tự động hoặc hộp thông báo lưu trữ mới.
- **Acceptance Criteria S1:** Given trạng thái một công việc thay đổi, When người dùng kiểm tra tại luồng tương ứng, Then thấy trạng thái phù hợp và biết khi cần chờ/thử lại; không phụ thuộc dịch vụ gửi thông báo tự động.

## Monitoring, quyền riêng tư và bảo toàn dữ liệu

### US-027 — Theo dõi số khách online

- **Liên kết:** REQ-022; FEAT-006; AC-022. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want xem số khách online hiện tại, So that biết mức sử dụng toàn hệ thống.
- **Preconditions:** Xác thực online, có tín hiệu hiện diện từ khách kết nối.
- **Dependency:** US-018; Design định danh/presence; không yêu cầu phiên làm việc mở chỉ để xem Monitoring.
- **Business Rule:** Một trình duyệt/thiết bị một khách; nhiều tab một; không theo IP; refresh 30 giây, hết tín hiệu 90 giây loại khỏi đếm.
- **Acceptance Criteria S1:** Given nhiều tab cùng trình duyệt và hai thiết bị cùng IP, When dashboard cập nhật, Then tab cùng trình duyệt đếm một và thiết bị khác đếm riêng; khách không còn tín hiệu 90 giây được loại theo timeout và phản ánh khi refresh.

### US-028 — Theo dõi số người trong phiên nghe hiện tại

- **Liên kết:** REQ-023, REQ-022; FEAT-006, FEAT-003; AC-023, AC-022. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want xem số khách trong phiên nghe thuyết minh hiện tại, So that biết mức sử dụng tính năng theo quy tắc đã thống nhất.
- **Preconditions:** Monitoring online; các sự kiện Play/Pause/kết thúc/đóng trang được nhận hoặc timeout áp dụng.
- **Dependency:** US-010, US-027; nhiều tab nghe đồng thời còn là chi tiết cần duyệt ở Design.
- **Business Rule:** Bắt đầu đếm từ Play, Pause vẫn đếm; hết bài/đóng trang bỏ ở refresh tiếp theo; mất tín hiệu áp dụng 90 giây. Không phải tổng lượt nghe hoặc số luồng phát ra âm thanh.
- **Acceptance Criteria S1:** Given một khách lần lượt Play, Pause rồi nghe hết/đóng trang, When dashboard cập nhật theo chu kỳ 30 giây, Then số đếm tuân thủ đúng vòng đời; không coi khách hoàn toàn offline là tín hiệu realtime đang được nhận.

### US-029 — Xem sức khỏe hệ thống và tiến độ pipeline

- **Liên kết:** REQ-024; FEAT-006, FEAT-003; AC-024. **Priority:** Must-have.
- **Description:** As a Staff hoặc Manager, I want xem trạng thái phụ thuộc và công việc nội dung, So that nhận biết công việc đang chạy, chờ hoặc lỗi.
- **Preconditions:** Xác thực và kết nối online.
- **Dependency:** US-011, US-013; Design cách thu trạng thái backend/MongoDB/worker.
- **Business Rule:** Hiển thị backend, kết nối MongoDB, Python worker, tiến độ/thành công/thất bại dịch/audio; nhịp cập nhật chi tiết sức khỏe/công việc cần cụ thể hóa ở Design.
- **Acceptance Criteria S1:** Given các trạng thái hoạt động/chờ/lỗi được tạo để kiểm tra, When xem dashboard, Then phản ánh đúng trạng thái phụ thuộc và công việc, không coi đầu ra giả lập là tích hợp thật của bản nghiệm thu.

### US-030 — Dùng vị trí mà không tạo lịch sử di chuyển

- **Liên kết:** REQ-025; FEAT-001, FEAT-002, FEAT-006; AC-025. **Priority:** Must-have.
- **Description:** As a du khách, I want vị trí được dùng cho chức năng du lịch mà không lưu lịch sử hành trình trong database, So that giới hạn dữ liệu cá nhân hệ thống giữ lại.
- **Preconditions:** Dùng chức năng có vị trí hoặc được hệ thống tính vào số khách.
- **Dependency:** US-002, US-005, US-027, US-028; rà cơ chế dữ liệu ở Design.
- **Business Rule:** Không có lịch sử di chuyển trong DB ứng dụng, không hiện vị trí từng khách trên Monitoring; không cam kết thay chính sách xử lý metadata của nhà cung cấp.
- **Acceptance Criteria S1:** Given sử dụng GPS/dẫn đường, When kiểm tra dữ liệu ứng dụng và dashboard, Then không có lịch sử di chuyển hoặc vị trí cá nhân được thêm trái quy tắc.

### US-031 — Bảo toàn và thử phục hồi dữ liệu đồ án

- **Liên kết:** REQ-026; FEAT-004, FEAT-005 và dữ liệu liên quan; AC-026. **Priority:** Must-have.
- **Description:** As a người vận hành của nhóm, I want giữ dữ liệu cần khôi phục và tạo bản sao để thử phục hồi, So that bảo vệ dữ liệu đồ án qua các mốc MVP.
- **Preconditions:** Có dữ liệu và quy trình sao lưu/phục hồi được duyệt; người thực hiện được chỉ định sau.
- **Dependency:** US-014–016, US-023; Design công cụ, bảo mật và cách kiểm chứng backup.
- **Business Rule:** Trong 35 ngày và 7 ngày tối ưu giữ POI xóa logic/media cần phục hồi/nhật ký; sao lưu tay DB và ảnh/audio đã duyệt ra máy nhóm trước mỗi MVP, thử phục hồi ít nhất một lần trước nghiệm thu cuối.
- **Acceptance Criteria S1:** Given dữ liệu nằm trong thời gian phải giữ, When vận hành và qua checkpoint, Then không dọn tự động các dữ liệu đó và có bằng chứng bản sao trước checkpoint.
- **Acceptance Criteria S2:** Given bản sao và quy trình đã duyệt, When thực hiện thử phục hồi trước nghiệm thu cuối, Then có kết quả kiểm chứng khôi phục dữ liệu theo quy trình, không coi sao lưu DB đơn thuần là đã sao lưu tệp media.

## Chất lượng và ràng buộc sản phẩm

### US-032 — Sử dụng các thao tác chính trong ngưỡng hiệu năng

- **Liên kết:** REQ-027; FEAT-001, FEAT-002, FEAT-003; AC-027. **Priority:** Must-have.
- **Description:** As a du khách, I want các thao tác chính phản hồi trong thời gian đã chốt, So that khám phá và dẫn đường không bị gián đoạn quá mức chấp nhận.
- **Preconditions:** Backend đã thức, có dữ liệu/GPS cần thiết; mạng ổn định với thao tác online.
- **Dependency:** US-001, US-003–005, US-010; Design/Test Plan chốt điều kiện mạng, phiên bản, mẫu đo và cách kiểm thử 50 khách.
- **Business Rule:** Ít nhất 95% thao tác đo: bản đồ ≤10 giây, tìm/gợi ý ≤2 giây, bắt đầu audio ≤3 giây, tính/tính lại tuyến ≤5 giây; tải gói và cold start Render khoảng một phút đo riêng.
- **Acceptance Criteria S1:** Given tải kiểm thử tối đa 50 khách đồng thời theo kế hoạch được duyệt, When đo từng loại thao tác, Then có kết quả đáp ứng các ngưỡng tương ứng; không dùng thời gian trích xuất dữ liệu desktop thay cho phép đo ứng dụng.

### US-033 — Giữ chi phí dịch vụ bằng không

- **Liên kết:** REQ-028, REQ-029; FEAT-001–006 theo phạm vi; AC-028, AC-029. **Priority:** Must-have.
- **Description:** As a Duy chịu trách nhiệm đồ án, I want hệ thống chỉ dùng dịch vụ miễn phí và dừng/chờ khi hết quota, So that không phát sinh chi phí chưa được cho phép.
- **Preconditions:** Thiết lập dịch vụ và vận hành theo lựa chọn đã duyệt.
- **Dependency:** US-013; Design kiểm tra điều kiện dịch vụ/quota và cấu hình không trả phí.
- **Business Rule:** Không tự nâng cấp, không dùng trả phí để vượt hạn mức; không tự đổi stack/nhà cung cấp khi có khó khăn.
- **Acceptance Criteria S1:** Given quota xử lý hết, When công việc gặp giới hạn, Then dừng/chờ, giữ kết quả, báo nguyên nhân và cho thử lại khi quota khả dụng; cấu hình/dịch vụ không tự phát sinh lựa chọn trả phí trái yêu cầu.

### US-034 — Nghiệm thu bản chạy theo các gate đã thống nhất

- **Liên kết:** REQ-030, REQ-029; FEAT-001–006; AC-030, AC-029. **Priority:** Must-have.
- **Description:** As a Duy là Team Lead và người nghiệm thu, I want có bản chạy và bằng chứng tại các checkpoint, So that kiểm chứng tiến độ theo phạm vi và quy trình đã chốt.
- **Preconditions:** Deliverable từng bước được chuẩn bị; Requirement/Design phải duyệt trước code ứng dụng.
- **Dependency:** Các story sản phẩm; kế hoạch milestone chi tiết, phân công và evidence được trình ở bước sau.
- **Business Rule:** 35 ngày lịch 22/10–25/11/2026; Day 5/10/15/20/25/30/35 có bản chạy. Day 5 đủ 15 POI/16 ngôn ngữ/tích hợp thật; tuần 26/11–02/12 chỉ tối ưu; Critical/Blocker không đánh dấu đạt.
- **Acceptance Criteria S1:** Given checkpoint đến hạn, When Duy xét bằng chứng và bản chạy, Then việc đánh dấu hoàn thành dựa trên phạm vi thực tế và gates; không thay bằng dữ liệu thu hẹp/dịch vụ giả rồi báo đạt.
- **Acceptance Criteria S2:** Given kỹ thuật/tiến độ không đáp ứng mục tiêu, When phát hiện vấn đề, Then trình rủi ro và đề xuất ảnh hưởng để Duy quyết định; không tự thay requirement hoặc deadline. Mốc Day 5 và offline vẫn chưa có bằng chứng khả thi tại thời điểm soạn story.

## Ma trận bao phủ yêu cầu

| PRD requirement / acceptance | Story chính hoặc ràng buộc áp dụng |
|---|---|
| REQ-001 / AC-001 | US-001 |
| REQ-002 / AC-002 | US-002 |
| REQ-003 / AC-003 | US-003 |
| REQ-004 / AC-004 | US-004 |
| REQ-005 / AC-005 | US-005 |
| REQ-006 / AC-006 | US-006 |
| REQ-007 / AC-007 | US-007, US-005, US-008 |
| REQ-008 / AC-008 | US-008 |
| REQ-009 / AC-009 | US-009, US-015 |
| REQ-010 / AC-010 | US-010 |
| REQ-011 / AC-011 | US-011 |
| REQ-012 / AC-012 | US-012 |
| REQ-013 / AC-013 | US-013 |
| REQ-014 / AC-014 | US-014, US-001 |
| REQ-015 / AC-015 | US-015, US-016 |
| REQ-016 / AC-016 | US-017, US-018, US-019, US-020 |
| REQ-017 / AC-017 | US-018, US-019, US-021, US-012 và quy tắc quyền trong các thao tác tương ứng |
| REQ-018 / AC-018 | US-022 và điều kiện phiên mở của các story nội dung |
| REQ-019 / AC-019 | US-023 |
| REQ-020 / AC-020 | US-024, US-025 |
| REQ-021 / AC-021 | US-026, US-008 |
| REQ-022 / AC-022 | US-027, US-028 |
| REQ-023 / AC-023 | US-028 |
| REQ-024 / AC-024 | US-029 |
| REQ-025 / AC-025 | US-030, US-002 |
| REQ-026 / AC-026 | US-031, US-016 |
| REQ-027 / AC-027 | US-032; áp dụng theo thao tác tương ứng ở story khách |
| REQ-028 / AC-028 | US-033, US-013; ràng buộc chi phí dùng chung |
| REQ-029 / AC-029 | Ràng buộc stack/môi trường/công cụ áp dụng toàn tài liệu; US-033, US-034. Không tạo thêm story ép chọn kiến trúc chưa được duyệt. |
| REQ-030 / AC-030 | US-034; gate và lịch cố định áp dụng toàn tài liệu |

## Gate tiếp theo

34 User Story US-001–US-034 đã được Duy phê duyệt theo DEC-045. Chưa tự gán 34 Use Case tương ứng: các story như US-012 (nhiều actor/bước duyệt), US-022 (vòng đời phiên), US-024 (hỗ trợ phục hồi), US-034 (nghiệm thu) có thể cần tách hoặc xử lý dưới dạng quy trình/ràng buộc dùng chung. Trước khi tạo Use Case, trình ánh xạ và giải thích chỗ một story dẫn tới nhiều Use Case để Duy xác nhận theo Master Prompt.

Sau khi Duy duyệt User Story, bước kế tiếp là đề xuất ánh xạ User Story → Use Case. Không chuyển ngay sang kiến trúc, schema, code, giao task hoặc tạo Issue từ bản này.
