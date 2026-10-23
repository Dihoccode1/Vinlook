# Vinlook — Use Cases v1.0

Ngày: 23/10/2026. **ĐÃ ĐƯỢC DUY DUYỆT**, DEC-048. Activity Diagrams được soạn riêng tại [danh mục sơ đồ](diagrams/activity/README.md), có trạng thái review riêng.

Ánh xạ 37 UC đã được Duy duyệt tại DEC-047. Nguồn: [ánh xạ](use-case-mapping-proposal.md), [User Stories](user-stories.md), [PRD](PRD.md). Phê duyệt ánh xạ không tự phê duyệt các flow chi tiết dưới đây. Các ID giữ nguyên; 30 luồng sản phẩm và 7 luồng vận hành. Không tạo UI vận hành, role RBAC mới, API, schema, service boundaries hoặc GitHub Issue.

Mỗi UC kế thừa toàn bộ AC nguồn. Main/alternative/exception dưới đây diễn đạt các story đã duyệt; chi tiết thao tác chưa có thiết kế không được tự đặt mặc định. Chưa xác định include/extend. Các ràng buộc miễn phí, quyền, offline, hiệu năng, Waterfall và Day 5 microservices/CI-CD áp dụng theo phạm vi. CD tự động sau checks/gate được duyệt, không yêu cầu duyệt tay từng lần.

## UC-001 — Xem bản đồ và các POI công khai

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-001. **Related Requirement / Acceptance:** REQ-001, REQ-014 / AC-001, AC-014.

**Related Feature:** FEAT-001, FEAT-004. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xem bản đồ và các POI công khai.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có dữ liệu công khai hợp lệ; online hoặc có gói offline đủ theo US-007.

**Dependencies:**

- US-014 cung cấp dữ liệu; US-012 cung cấp bản công khai. Đây không phải yêu cầu phải phát triển UI sau Admin.

**Main Flow:**

1. Mở bản đồ.
2. Đọc tập POI công khai trong dữ liệu đang dùng.
3. Hiển thị bản đồ và điểm tham quan.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given dữ liệu 15 POI đã công khai, When khách mở bản đồ không đăng nhập, Then xem được bản đồ và thông tin/ảnh POI tương ứng trên hai họ trình duyệt, phạm vi không thu hẹp về nội thành cũ.

**Alternative / Exception Flow:**

- Offline dùng gói đã tải đủ; không có dữ liệu offline thì không báo sẵn sàng.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xem bản đồ và các poi công khai** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Toàn TP.HCM theo ranh giới hiện tại; 15 POI ban đầu; Chrome Android/Safari iPhone; du khách chỉ đọc bản công khai.

**Acceptance Criteria:** Duy xét kết quả theo REQ-001, REQ-014 / AC-001, AC-014 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-002 — Xem thông tin, ảnh và mô tả một POI

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-001, US-010. **Related Requirement / Acceptance:** REQ-001, REQ-010, REQ-014 / AC-001, AC-010, AC-014.

**Related Feature:** FEAT-001, FEAT-003, FEAT-004. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xem thông tin, ảnh và mô tả một POI.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có dữ liệu công khai hợp lệ; online hoặc có gói offline đủ theo US-007.
- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.

**Dependencies:**

- US-014 cung cấp dữ liệu; US-012 cung cấp bản công khai. Đây không phải yêu cầu phải phát triển UI sau Admin.
- US-012, US-014; US-007 khi offline.

**Main Flow:**

1. Chọn một POI công khai.
2. Đọc thông tin ảnh và mô tả của điểm.
3. Hiển thị chi tiết theo ngôn ngữ khả dụng.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given dữ liệu 15 POI đã công khai, When khách mở bản đồ không đăng nhập, Then xem được bản đồ và thông tin/ảnh POI tương ứng trên hai họ trình duyệt, phạm vi không thu hẹp về nội thành cũ.
- S2: Given online, When khách lần lượt chọn từng ngôn ngữ và bấm Play, Then UI/mô tả/audio đúng ngôn ngữ/biến thể và audio đúng thời lượng; chọn POI mà chưa Play không phát.

**Alternative / Exception Flow:**

- Bản nháp chưa duyệt không được thay bản công khai.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xem thông tin, ảnh và mô tả một poi** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Toàn TP.HCM theo ranh giới hiện tại; 15 POI ban đầu; Chrome Android/Safari iPhone; du khách chỉ đọc bản công khai.
- Online đúng 16 ngôn ngữ/biến thể tại PRD mục 5, áp dụng UI/text/audio; bài đọc 90–150 giây. Offline chỉ Anh, không tự phát theo GPS/chọn POI.

**Acceptance Criteria:** Duy xét kết quả theo REQ-001, REQ-010, REQ-014 / AC-001, AC-010, AC-014 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-003 — Dùng vị trí hiện tại và xử lý quyền GPS

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-002. **Related Requirement / Acceptance:** REQ-002, REQ-025 / AC-002, AC-025.

**Related Feature:** FEAT-001, FEAT-002. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Dùng vị trí hiện tại và xử lý quyền GPS.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Mở Vinlook trên thiết bị hỗ trợ vị trí.

**Dependencies:**

- US-001; quyền GPS và vị trí khả dụng khi gọi chức năng theo vị trí.

**Main Flow:**

1. Yêu cầu dùng vị trí.
2. Nhận kết quả quyền và vị trí từ thiết bị.
3. Hiển thị vị trí nếu khả dụng.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given đã cấp quyền và có GPS, When lấy vị trí, Then bản đồ hiển thị vị trí hiện tại.
- S2: Given từ chối GPS, When dùng app, Then các chức năng không cần GPS vẫn dùng được; khi gọi gợi ý theo vị trí/dẫn đường thì được thông báo điều kiện GPS.

**Alternative / Exception Flow:**

- Từ chối GPS vẫn xem/tìm/nghe/tải được; chức năng cần GPS thông báo điều kiện.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **dùng vị trí hiện tại và xử lý quyền gps** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Không cấp quyền vẫn xem bản đồ/tìm POI/nghe/tải; gợi ý theo vị trí và dẫn đường cần GPS; không lưu lịch sử di chuyển.

**Acceptance Criteria:** Duy xét kết quả theo REQ-002, REQ-025 / AC-002, AC-025 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-004 — Xem/chọn từ các POI gần nhất

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-003. **Related Requirement / Acceptance:** REQ-003 / AC-003.

**Related Feature:** FEAT-001. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xem/chọn từ các POI gần nhất.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có vị trí và tập POI công khai phù hợp dữ liệu đang sử dụng.

**Dependencies:**

- US-001, US-002; US-007 nếu offline.

**Main Flow:**

1. Mở danh sách gợi ý với GPS khả dụng.
2. Lọc POI trong 3 km đường thẳng và xếp gần nhất.
3. Hiển thị tối đa 4 điểm để chọn.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given hơn 4 POI đủ điều kiện, When xem gợi ý, Then nhận 4 điểm gần nhất đúng thứ tự khoảng cách.
- S2: Given chỉ có 0–3 POI đủ điều kiện, When xem gợi ý, Then hiển thị đúng số tìm được, không bù điểm ngoài 3 km.

**Alternative / Exception Flow:**

- Có 0–3 điểm thì hiển thị đúng số, không mở rộng bán kính.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xem/chọn từ các poi gần nhất** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Tối đa 4 điểm gần nhất trong 3 km đường thẳng; không tự mở rộng bán kính.

**Acceptance Criteria:** Duy xét kết quả theo REQ-003 / AC-003 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-005 — Tìm kiếm và chọn POI

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-004. **Related Requirement / Acceptance:** REQ-004 / AC-004.

**Related Feature:** FEAT-001, FEAT-002. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Tìm kiếm và chọn POI.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có POI công khai trong dữ liệu đang dùng; cần GPS để yêu cầu tuyến.

**Dependencies:**

- US-001, US-003 cho luồng gợi ý; US-005 cho dẫn đường.

**Main Flow:**

1. Nhập tìm kiếm hoặc chọn từ gợi ý.
2. Hiển thị kết quả và nhận điểm được chọn.
3. Cho xem thông tin hoặc chuyển điểm đó sang dẫn đường.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given một POI có thể tiếp cận trong dữ liệu, When tìm và chọn hoặc chọn từ gợi ý, Then đích dẫn đường là đúng POI đó; không yêu cầu tạo hành trình nhiều điểm.

**Alternative / Exception Flow:**

- Tìm/xem không cần GPS; chỉ khi yêu cầu tuyến mới cần GPS. Không tự thêm luật tìm gần đúng.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **tìm kiếm và chọn poi** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Một đích mỗi lần; 3 km là giới hạn gợi ý đường thẳng, không giới hạn chiều dài tuyến đi bộ.

**Acceptance Criteria:** Duy xét kết quả theo REQ-004 / AC-004 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-006 — Dẫn đường đi bộ đến một đích

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-004, US-005, US-006. **Related Requirement / Acceptance:** REQ-004–007, REQ-027 / AC-004–007, AC-027.

**Related Feature:** FEAT-001, FEAT-002. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Dẫn đường đi bộ đến một đích.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có POI công khai trong dữ liệu đang dùng; cần GPS để yêu cầu tuyến.
- GPS khả dụng, có đích, dữ liệu cần thiết và tuyến đi bộ hợp lệ.
- Đang yêu cầu tuyến hoặc đang dẫn đường.

**Dependencies:**

- US-001, US-003 cho luồng gợi ý; US-005 cho dẫn đường.
- US-002, US-004; US-007 nếu offline; engine/graph cần kiểm chứng trong Design.
- US-005; không tự chọn tham số phát hiện lỗi hoặc engine tại đây.

**Main Flow:**

1. Nhận POI đích và vị trí khả dụng.
2. Tính tuyến đi bộ và hiện chữ/hình.
3. Cập nhật khi di chuyển và tính lại khi đi lệch.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given một POI có thể tiếp cận trong dữ liệu, When tìm và chọn hoặc chọn từ gợi ý, Then đích dẫn đường là đúng POI đó; không yêu cầu tạo hành trình nhiều điểm.
- S2: Given có tuyến hợp lệ, When khách di chuyển rồi lệch tuyến, Then vị trí/chỉ dẫn cập nhật và tuyến được tính lại; thực hiện được cả khi ngắt Internet với gói đầy đủ, trong ngưỡng AC-027.
- S3: Given không tìm được tuyến, When nhận kết quả, Then thấy thông báo và có thể thử lại/chọn điểm khác.
- S4: Given đang dẫn đường rồi mất GPS, When GPS mất và sau đó trở lại, Then giữ thông tin cuối với trạng thái mất GPS, không giả làm vị trí hiện tại, rồi tiếp tục cập nhật khi có GPS.

**Alternative / Exception Flow:**

- Không có tuyến: báo và thử lại/chọn khác. Mất GPS: giữ tuyến/vị trí cuối kèm trạng thái; có lại thì cập nhật. Offline dùng dữ liệu đã tải.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **dẫn đường đi bộ đến một đích** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Một đích mỗi lần; 3 km là giới hạn gợi ý đường thẳng, không giới hạn chiều dài tuyến đi bộ.
- Chỉ dẫn chữ/hình khi màn hình Vinlook mở; không yêu cầu giọng nói hoặc hoạt động nền.
- Không có tuyến thì báo và cho thử lại/chọn POI khác; mất GPS giữ tuyến/vị trí cuối nhưng báo không khả dụng.

**Acceptance Criteria:** Duy xét kết quả theo REQ-004–007, REQ-027 / AC-004–007, AC-027 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-007 — Tải dữ liệu offline lần đầu

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-008. **Related Requirement / Acceptance:** REQ-007, REQ-008, REQ-021 / AC-007, AC-008, AC-021.

**Related Feature:** FEAT-001, FEAT-002, FEAT-003, FEAT-004. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Tải dữ liệu offline lần đầu.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Online, có gói được cung cấp; có thể đã có gói cũ.

**Dependencies:**

- Dữ liệu công khai US-012/014; phương án đóng gói/phân phối/lưu trữ tại Design.

**Main Flow:**

1. Khách chủ động bắt đầu tải khi online.
2. Tải bộ dữ liệu offline được cung cấp.
3. Xác nhận đủ rồi báo sẵn sàng.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given có bản mới, When khách bắt đầu tải và tải đủ, Then ứng dụng mới báo hoàn tất và dùng bản thay thế.
- S2: Given có gói cũ, When cập nhật bị ngắt/lỗi, Then gói cũ còn dùng được, có trạng thái chưa hoàn tất và có thể thử lại; không báo ready cho phần tải thiếu.

**Alternative / Exception Flow:**

- Tải ngắt/lỗi báo chưa hoàn tất, cho thử lại; không báo ready khi thiếu.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **tải dữ liệu offline lần đầu** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Báo bản mới để khách chủ động tải; chỉ báo ready khi đủ; giữ bản cũ đến khi bản mới hoàn chỉnh.

**Acceptance Criteria:** Duy xét kết quả theo REQ-007, REQ-008, REQ-021 / AC-007, AC-008, AC-021 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-008 — Mở lại và tiếp tục dùng khi offline

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-007, US-009. **Related Requirement / Acceptance:** REQ-007, REQ-009 / AC-007, AC-009.

**Related Feature:** FEAT-001, FEAT-002, FEAT-003, FEAT-004. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Mở lại và tiếp tục dùng khi offline.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Đã chuẩn bị/tải đủ dữ liệu khi online; GPS và quyền khả dụng cho chức năng cần vị trí.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Dependencies:**

- US-008; các luồng US-001–005, US-010; phương án offline được duyệt trong Design.
- US-007, US-010, US-015; cơ chế đồng bộ tại Design.

**Main Flow:**

1. Khách mở lại ứng dụng không có Internet.
2. Đọc gói offline đã tải đủ và dùng tiếng Anh.
3. Cho xem/tìm/nghe và GPS/dẫn đường/tính lại với dữ liệu sẵn có.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given đã tải đủ, When đóng app, ngắt Internet và mở lại, Then hoàn tất các luồng nêu trên trên hai họ thiết bị/trình duyệt đã chọn, không gọi backend để hoàn thành chức năng offline.
- S2: Given đang dùng ngôn ngữ khác, When mất mạng, Then thực hiện đúng chuyển đổi trên và không tự phát audio Anh.
- S3: Given gói cũ còn POI đã xóa trên server, When kết nối và đồng bộ trạng thái xóa, Then POI bị ẩn khỏi bản đồ/tìm/gợi ý. Cách khôi phục lựa chọn ngôn ngữ khi có mạng và xử lý đích đang dẫn bị xóa vẫn chờ duyệt trong Design.

**Alternative / Exception Flow:**

- GPS không khả dụng xử lý theo UC-003/006; chưa có gói đủ không tuyên bố dùng offline được.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **mở lại và tiếp tục dùng khi offline** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Giao diện/text/audio offline tiếng Anh; bản đồ toàn phạm vi đã chốt, POI/ảnh, tìm/gợi ý, GPS, tính/tính lại đường và audio phải dùng được.
- Mất mạng chuyển UI/text sang Anh, báo offline, dừng audio ngôn ngữ khác; khách bấm Play để nghe Anh. Trạng thái xóa chỉ truyền tới máy mất mạng khi kết nối/đồng bộ lại.

**Acceptance Criteria:** Duy xét kết quả theo REQ-007, REQ-009 / AC-007, AC-009 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-009 — Cập nhật gói offline đã có

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-008, US-009. **Related Requirement / Acceptance:** REQ-008, REQ-009, REQ-021 / AC-008, AC-009, AC-021.

**Related Feature:** FEAT-001, FEAT-002, FEAT-003, FEAT-004. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Cập nhật gói offline đã có.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Online, có gói được cung cấp; có thể đã có gói cũ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Dependencies:**

- Dữ liệu công khai US-012/014; phương án đóng gói/phân phối/lưu trữ tại Design.
- US-007, US-010, US-015; cơ chế đồng bộ tại Design.

**Main Flow:**

1. Báo có bản dữ liệu mới.
2. Khách chủ động tải bản mới trong khi giữ gói cũ.
3. Thay thế khi bản mới tải đủ.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given có bản mới, When khách bắt đầu tải và tải đủ, Then ứng dụng mới báo hoàn tất và dùng bản thay thế.
- S2: Given có gói cũ, When cập nhật bị ngắt/lỗi, Then gói cũ còn dùng được, có trạng thái chưa hoàn tất và có thể thử lại; không báo ready cho phần tải thiếu.
- S3: Given đang dùng ngôn ngữ khác, When mất mạng, Then thực hiện đúng chuyển đổi trên và không tự phát audio Anh.
- S4: Given gói cũ còn POI đã xóa trên server, When kết nối và đồng bộ trạng thái xóa, Then POI bị ẩn khỏi bản đồ/tìm/gợi ý. Cách khôi phục lựa chọn ngôn ngữ khi có mạng và xử lý đích đang dẫn bị xóa vẫn chờ duyệt trong Design.

**Alternative / Exception Flow:**

- Lỗi giữ gói cũ, báo chưa xong và cho thử lại. POI xóa được ẩn sau đồng bộ trạng thái xóa khi có mạng.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **cập nhật gói offline đã có** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Báo bản mới để khách chủ động tải; chỉ báo ready khi đủ; giữ bản cũ đến khi bản mới hoàn chỉnh.
- Mất mạng chuyển UI/text sang Anh, báo offline, dừng audio ngôn ngữ khác; khách bấm Play để nghe Anh. Trạng thái xóa chỉ truyền tới máy mất mạng khi kết nối/đồng bộ lại.

**Acceptance Criteria:** Duy xét kết quả theo REQ-008, REQ-009, REQ-021 / AC-008, AC-009, AC-021 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-010 — Chọn ngôn ngữ giao diện/nội dung du khách

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-010, US-009. **Related Requirement / Acceptance:** REQ-009, REQ-010 / AC-009, AC-010.

**Related Feature:** FEAT-001, FEAT-002, FEAT-003, FEAT-004. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Chọn ngôn ngữ giao diện/nội dung du khách.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Dependencies:**

- US-012, US-014; US-007 khi offline.
- US-007, US-010, US-015; cơ chế đồng bộ tại Design.

**Main Flow:**

1. Khách chọn ngôn ngữ online.
2. Hiển thị UI và mô tả theo lựa chọn trong 16 ngôn ngữ.
3. Giữ nội dung tương ứng trong luồng xem.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given online, When khách lần lượt chọn từng ngôn ngữ và bấm Play, Then UI/mô tả/audio đúng ngôn ngữ/biến thể và audio đúng thời lượng; chọn POI mà chưa Play không phát.
- S2: Given đang dùng ngôn ngữ khác, When mất mạng, Then thực hiện đúng chuyển đổi trên và không tự phát audio Anh.
- S3: Given gói cũ còn POI đã xóa trên server, When kết nối và đồng bộ trạng thái xóa, Then POI bị ẩn khỏi bản đồ/tìm/gợi ý. Cách khôi phục lựa chọn ngôn ngữ khi có mạng và xử lý đích đang dẫn bị xóa vẫn chờ duyệt trong Design.

**Alternative / Exception Flow:**

- Offline chỉ Anh; khi mất mạng chuyển UI/text sang Anh. Chưa quyết định tự khôi phục ngôn ngữ khi có mạng lại.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **chọn ngôn ngữ giao diện/nội dung du khách** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Online đúng 16 ngôn ngữ/biến thể tại PRD mục 5, áp dụng UI/text/audio; bài đọc 90–150 giây. Offline chỉ Anh, không tự phát theo GPS/chọn POI.
- Mất mạng chuyển UI/text sang Anh, báo offline, dừng audio ngôn ngữ khác; khách bấm Play để nghe Anh. Trạng thái xóa chỉ truyền tới máy mất mạng khi kết nối/đồng bộ lại.

**Acceptance Criteria:** Duy xét kết quả theo REQ-009, REQ-010 / AC-009, AC-010 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-011 — Nghe thuyết minh POI theo ngôn ngữ

**Loại:** Sản phẩm. **Actor:** Du khách.

**Related User Story:** US-010, US-009. **Related Requirement / Acceptance:** REQ-009, REQ-010, REQ-023 / AC-009, AC-010, AC-023.

**Related Feature:** FEAT-001, FEAT-002, FEAT-003, FEAT-004. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Nghe thuyết minh POI theo ngôn ngữ.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- POI công khai có đủ nội dung được duyệt; offline cần gói Anh đủ.
- Có gói Anh đã tải; đang dùng ngôn ngữ khác hoặc có POI sau đó bị đánh dấu xóa.

**Dependencies:**

- US-012, US-014; US-007 khi offline.
- US-007, US-010, US-015; cơ chế đồng bộ tại Design.

**Main Flow:**

1. Khách chọn POI/ngôn ngữ và bấm Play.
2. Phát audio được duyệt của POI bằng ngôn ngữ đó.
3. Nhận Pause/kết thúc theo vòng đời nghe đã chốt.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given online, When khách lần lượt chọn từng ngôn ngữ và bấm Play, Then UI/mô tả/audio đúng ngôn ngữ/biến thể và audio đúng thời lượng; chọn POI mà chưa Play không phát.
- S2: Given đang dùng ngôn ngữ khác, When mất mạng, Then thực hiện đúng chuyển đổi trên và không tự phát audio Anh.
- S3: Given gói cũ còn POI đã xóa trên server, When kết nối và đồng bộ trạng thái xóa, Then POI bị ẩn khỏi bản đồ/tìm/gợi ý. Cách khôi phục lựa chọn ngôn ngữ khi có mạng và xử lý đích đang dẫn bị xóa vẫn chờ duyệt trong Design.

**Alternative / Exception Flow:**

- Chọn POI/GPS không tự phát; mất mạng dừng audio khác Anh, khách bấm Play nghe Anh đã tải. Pause vẫn tính người nghe.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **nghe thuyết minh poi theo ngôn ngữ** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Online đúng 16 ngôn ngữ/biến thể tại PRD mục 5, áp dụng UI/text/audio; bài đọc 90–150 giây. Offline chỉ Anh, không tự phát theo GPS/chọn POI.
- Mất mạng chuyển UI/text sang Anh, báo offline, dừng audio ngôn ngữ khác; khách bấm Play để nghe Anh. Trạng thái xóa chỉ truyền tới máy mất mạng khi kết nối/đồng bộ lại.

**Acceptance Criteria:** Duy xét kết quả theo REQ-009, REQ-010, REQ-023 / AC-009, AC-010, AC-023 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-012 — Tạo/chỉnh sửa và lưu POI nháp

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-014. **Related Requirement / Acceptance:** REQ-014, REQ-018, REQ-019 / AC-014, AC-018, AC-019.

**Related Feature:** FEAT-004, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Tạo/chỉnh sửa và lưu POI nháp.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có quyền, online, phiên mở; có dữ liệu đầu vào phù hợp.

**Dependencies:**

- US-018, US-022; cấu trúc dữ liệu phải được duyệt tại Design.

**Main Flow:**

1. Người có quyền và phiên mở thêm/sửa POI.
2. Lưu dữ liệu vào bản nháp.
3. Đọc lại dữ liệu và ghi nhật ký thao tác.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given một POI mới hoặc đã công khai, When thêm/sửa và lưu, Then dữ liệu đọc lại được, bản nháp tách khỏi bản công khai và khách chưa nhận bản sửa trước US-012; thao tác được ghi nhật ký.

**Alternative / Exception Flow:**

- Chưa có quyền/phiên không sửa được; bản công khai cũ không đổi do lưu nháp. Tạo và sửa là hai biến thể của luồng.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **tạo/chỉnh sửa và lưu poi nháp** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Thông tin/tọa độ/thumbnail, text/audio theo ngôn ngữ, bản nháp/công khai; không có bán kính riêng mỗi POI. Điểm Củ Chi ban đầu là Bến Dược.

**Acceptance Criteria:** Duy xét kết quả theo REQ-014, REQ-018, REQ-019 / AC-014, AC-018, AC-019 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-013 — Chủ động chạy dịch và tạo audio

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-011, US-013. **Related Requirement / Acceptance:** REQ-011, REQ-013, REQ-018 / AC-011, AC-013, AC-018.

**Related Feature:** FEAT-003, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Chủ động chạy dịch và tạo audio.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Tài khoản có quyền, online, phiên làm việc mở và có nguồn tiếng Anh.
- Có công việc đang xử lý/chờ/lỗi; thao tác chủ động cần quyền, online và phiên mở.

**Dependencies:**

- US-014, US-018, US-022; provider/worker đúng lựa chọn được duyệt.
- US-011, US-012, US-029.

**Main Flow:**

1. Người có quyền và phiên mở chủ động chạy xử lý.
2. Tạo bản dịch/audio từ nguồn Anh theo provider được duyệt.
3. Giữ kết quả và trạng thái để nhân viên kiểm tra.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given sửa/lưu nguồn, When chưa bấm xử lý, Then pipeline chưa tự chạy; When người có quyền chủ động chạy, Then công việc dịch/audio được thực hiện và có trạng thái để theo dõi.
- S2: Given một phần đã thành công và phần khác lỗi/chờ quota/worker, When theo dõi và thử lại lúc có điều kiện, Then giữ kết quả tốt, xử lý tiếp phần cần thiết, không bỏ qua cổng duyệt hoặc làm gián đoạn bản công khai cũ.

**Alternative / Exception Flow:**

- Lưu nháp không tự chạy; lỗi giữ phần tốt; worker tắt thì chờ; quota hết dừng và báo lý do, không tự công khai/trả phí.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **chủ động chạy dịch và tạo audio** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Sửa/lưu không tự chạy pipeline; xử lý không tự công khai.
- Worker MMS tắt thì chờ; quota hết thì dừng và báo nguyên nhân; không nâng cấp trả phí, không công khai từng phần.

**Acceptance Criteria:** Duy xét kết quả theo REQ-011, REQ-013, REQ-018 / AC-011, AC-013, AC-018 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-014 — Thử lại phần xử lý bị lỗi/chờ khi có điều kiện

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-013. **Related Requirement / Acceptance:** REQ-013, REQ-028 / AC-013, AC-028.

**Related Feature:** FEAT-003, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Thử lại phần xử lý bị lỗi/chờ khi có điều kiện.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Theo DEC-050: đã có công việc lỗi/chờ; đây là lần khởi phát độc lập, không phải extend UC-013. Cần tài khoản có quyền, phiên hiện tại mở và dịch vụ/worker/quota khả dụng khi thực hiện thử lại.

- Có công việc đang xử lý/chờ/lỗi; thao tác chủ động cần quyền, online và phiên mở.

**Dependencies:**

- US-011, US-012, US-029.

**Main Flow:**

1. Người có quyền chọn phần xử lý chưa hoàn tất.
2. Khi điều kiện dịch vụ/worker/quota cho phép, chủ động thử lại.
3. Giữ kết quả tốt trước đó và cập nhật trạng thái phần được chạy lại.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given một phần đã thành công và phần khác lỗi/chờ quota/worker, When theo dõi và thử lại lúc có điều kiện, Then giữ kết quả tốt, xử lý tiếp phần cần thiết, không bỏ qua cổng duyệt hoặc làm gián đoạn bản công khai cũ.

**Alternative / Exception Flow:**

- Điều kiện chưa có thì tiếp tục chờ/báo lý do; chưa đủ 16 ngôn ngữ thì chưa công khai bản mới.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **thử lại phần xử lý bị lỗi/chờ khi có điều kiện** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Worker MMS tắt thì chờ; quota hết thì dừng và báo nguyên nhân; không nâng cấp trả phí, không công khai từng phần.

**Acceptance Criteria:** Duy xét kết quả theo REQ-013, REQ-028 / AC-013, AC-028 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-015 — Kiểm tra và trình nội dung để duyệt công khai

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-012. **Related Requirement / Acceptance:** REQ-012, REQ-017–019 / AC-012, AC-017–019.

**Related Feature:** FEAT-003, FEAT-004, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Kiểm tra và trình nội dung để duyệt công khai.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Online, phiên mở và có bản cần kiểm tra/duyệt.

**Dependencies:**

- US-011, US-014, US-018, US-022.

**Main Flow:**

1. Staff hoặc Manager trong phiên mở đọc kết quả text/audio.
2. Kiểm tra các đầu ra theo ngôn ngữ và thời lượng.
3. Trình bản cần Manager duyệt công khai.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given còn thiếu bất kỳ ngôn ngữ/đầu ra/phê duyệt nào, When yêu cầu công khai, Then bản mới chưa được công khai và bản cũ còn phục vụ.
- S2: Given đầy đủ điều kiện, When Manager duyệt/công khai, Then khách nhận bản mới; quyền Staff không thực hiện được thao tác công khai, kể cả gọi trực tiếp chức năng tương ứng.

**Alternative / Exception Flow:**

- Đầu ra lỗi/thiếu chuyển xử lý lại theo UC-014, không công khai bằng quyền Staff. Chưa tự thêm nút từ chối hay sửa dịch tay.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **kiểm tra và trình nội dung để duyệt công khai** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Staff kiểm tra/trình duyệt; Manager công khai đủ text/audio đã duyệt cho cả 16 ngôn ngữ, được duyệt bản mình sửa. Bản công khai cũ tiếp tục phục vụ khi bản mới đang chờ.

**Acceptance Criteria:** Duy xét kết quả theo REQ-012, REQ-017–019 / AC-012, AC-017–019 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-016 — Duyệt và công khai bản đủ 16 ngôn ngữ

**Loại:** Sản phẩm. **Actor:** Manager.

**Related User Story:** US-012. **Related Requirement / Acceptance:** REQ-012, REQ-017–019 / AC-012, AC-017–019.

**Related Feature:** FEAT-003, FEAT-004, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Duyệt và công khai bản đủ 16 ngôn ngữ.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Online, phiên mở và có bản cần kiểm tra/duyệt.

**Dependencies:**

- US-011, US-014, US-018, US-022.

**Main Flow:**

1. Manager trong phiên mở xét bản được trình.
2. Kiểm tra đủ text/audio được duyệt cho 16 ngôn ngữ.
3. Duyệt/công khai bản hợp lệ và ghi nhật ký.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given còn thiếu bất kỳ ngôn ngữ/đầu ra/phê duyệt nào, When yêu cầu công khai, Then bản mới chưa được công khai và bản cũ còn phục vụ.
- S2: Given đầy đủ điều kiện, When Manager duyệt/công khai, Then khách nhận bản mới; quyền Staff không thực hiện được thao tác công khai, kể cả gọi trực tiếp chức năng tương ứng.

**Alternative / Exception Flow:**

- Thiếu điều kiện chặn công khai, giữ bản cũ. Manager được duyệt bản tự sửa; Staff không thực hiện được.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **duyệt và công khai bản đủ 16 ngôn ngữ** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Staff kiểm tra/trình duyệt; Manager công khai đủ text/audio đã duyệt cho cả 16 ngôn ngữ, được duyệt bản mình sửa. Bản công khai cũ tiếp tục phục vụ khi bản mới đang chờ.

**Acceptance Criteria:** Duy xét kết quả theo REQ-012, REQ-017–019 / AC-012, AC-017–019 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-017 — Đánh dấu xóa POI

**Loại:** Sản phẩm. **Actor:** Manager.

**Related User Story:** US-015. **Related Requirement / Acceptance:** REQ-009, REQ-015, REQ-018, REQ-019 / AC-009, AC-015, AC-018, AC-019.

**Related Feature:** FEAT-004, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Đánh dấu xóa POI.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Manager có quyền, online, phiên mở, POI tồn tại.

**Dependencies:**

- US-014, US-022, US-023; US-009 cho đồng bộ khách.

**Main Flow:**

1. Manager có phiên mở chọn POI cần ngừng phục vụ.
2. Đánh dấu xóa và giữ bản ghi/nội dung cần phục hồi.
3. Ghi nhật ký và ẩn điểm khỏi dữ liệu công khai sau đồng bộ.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given POI đang phục vụ, When Manager đánh dấu xóa, Then bản ghi còn tồn tại, thao tác có nhật ký và POI bị ẩn sau đồng bộ; Staff bị từ chối. Máy hoàn toàn mất mạng có thể còn gói cũ đến khi đồng bộ.

**Alternative / Exception Flow:**

- Staff bị từ chối; thiết bị hoàn toàn offline có thể giữ gói cũ đến lúc đồng bộ.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **đánh dấu xóa poi** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Chỉ Manager; giữ bản ghi, không xóa vật lý.

**Acceptance Criteria:** Duy xét kết quả theo REQ-009, REQ-015, REQ-018, REQ-019 / AC-009, AC-015, AC-018, AC-019 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-018 — Khôi phục POI đã đánh dấu xóa về nháp

**Loại:** Sản phẩm. **Actor:** Manager.

**Related User Story:** US-016. **Related Requirement / Acceptance:** REQ-015, REQ-018, REQ-019, REQ-026 / AC-015, AC-018, AC-019, AC-026.

**Related Feature:** FEAT-004, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Khôi phục POI đã đánh dấu xóa về nháp.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- POI đã xóa logic và dữ liệu cần phục hồi còn giữ; Manager online, phiên mở.

**Dependencies:**

- US-015, US-012, US-022, US-031.

**Main Flow:**

1. Manager có phiên mở chọn POI đã xóa logic.
2. Khôi phục dữ liệu về trạng thái nháp.
3. Ghi nhật ký và chuyển về quy trình kiểm tra/duyệt.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given một POI đã xóa logic, When Manager khôi phục, Then dữ liệu trở về nháp và có nhật ký, chưa tự xuất hiện như POI công khai; Staff không khôi phục được.

**Alternative / Exception Flow:**

- Không tự công khai lại; phải đủ điều kiện 16 ngôn ngữ ở UC-016. Staff không được khôi phục.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **khôi phục poi đã đánh dấu xóa về nháp** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Khôi phục về nháp, cần duyệt lại đủ 16 ngôn ngữ trước công khai.

**Acceptance Criteria:** Duy xét kết quả theo REQ-015, REQ-018, REQ-019, REQ-026 / AC-015, AC-018, AC-019, AC-026 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-019 — Đăng ký nhân viên và nhận trạng thái chờ

**Loại:** Sản phẩm. **Actor:** Người đăng ký Staff.

**Related User Story:** US-017, US-026. **Related Requirement / Acceptance:** REQ-016, REQ-021 / AC-016, AC-021.

**Related Feature:** FEAT-003, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Đăng ký nhân viên và nhận trạng thái chờ.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Online, chưa được cấp quyền Staff cho đăng ký này.
- Đang truy cập luồng tương ứng, theo đúng quyền và điều kiện mạng của luồng.

**Dependencies:**

- US-019; cơ chế xác thực thuộc Design.
- US-008, US-011, US-013, US-017, US-019.

**Main Flow:**

1. Người đăng ký nhập họ tên email mật khẩu và xác nhận.
2. Kiểm tra xác nhận mật khẩu phù hợp.
3. Ghi đăng ký chờ Manager duyệt và hiện trạng thái.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given nhập đủ thông tin với xác nhận mật khẩu khớp, When đăng ký thành công, Then tài khoản chờ duyệt, chưa có quyền Staff; xác nhận không khớp bị từ chối.
- S2: Given trạng thái một công việc thay đổi, When người dùng kiểm tra tại luồng tương ứng, Then thấy trạng thái phù hợp và biết khi cần chờ/thử lại; không phụ thuộc dịch vụ gửi thông báo tự động.

**Alternative / Exception Flow:**

- Xác nhận mật khẩu không khớp bị từ chối; tài khoản chờ chưa có quyền Staff. Chưa tự chọn email verification.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **đăng ký nhân viên và nhận trạng thái chờ** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Họ tên, email, mật khẩu và xác nhận mật khẩu; phải chờ duyệt.
- Chỉ trạng thái trong app, không email/SMS/push tự động hoặc hộp thông báo lưu trữ mới.

**Acceptance Criteria:** Duy xét kết quả theo REQ-016, REQ-021 / AC-016, AC-021 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-020 — Đăng nhập theo trạng thái/quyền tài khoản

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-018. **Related Requirement / Acceptance:** REQ-016, REQ-017 / AC-016, AC-017.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Đăng nhập theo trạng thái/quyền tài khoản.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Online, có tài khoản tương ứng.

**Dependencies:**

- US-019 hoặc US-020 cho cấp quyền ban đầu; cơ chế JWT/RBAC ở Design.

**Main Flow:**

1. Nhân viên nhập email/mật khẩu.
2. Xác thực và kiểm tra trạng thái/quyền tài khoản.
3. Cho truy cập đúng quyền Staff/Manager.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given tài khoản đã duyệt/khả dụng và thông tin đúng, When đăng nhập, Then dùng được chức năng theo vai trò; tài khoản chờ/khóa không truy cập được chức năng Staff/Manager trái quyền.

**Alternative / Exception Flow:**

- Sai thông tin hoặc tài khoản chưa duyệt/khóa không nhận quyền tương ứng; chưa tự đặt thời hạn token hoặc khóa do nhập sai.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **đăng nhập theo trạng thái/quyền tài khoản** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Tài khoản chờ hoặc khóa không nhận quyền Staff đang hoạt động; hai vai trò đúng ma trận PRD.

**Acceptance Criteria:** Duy xét kết quả theo REQ-016, REQ-017 / AC-016, AC-017 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-021 — Duyệt đăng ký để cấp quyền Staff

**Loại:** Sản phẩm. **Actor:** Manager.

**Related User Story:** US-019. **Related Requirement / Acceptance:** REQ-016, REQ-017 / AC-016, AC-017.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Duyệt đăng ký để cấp quyền Staff.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Manager online và được xác thực; có đăng ký chờ.

**Dependencies:**

- US-017, US-020; không tự thêm yêu cầu phiên mở cho quản trị tài khoản chưa được chốt.

**Main Flow:**

1. Manager xem đăng ký đang chờ.
2. Phê duyệt cấp quyền Staff.
3. Hiển thị trạng thái đã duyệt để nhân viên đăng nhập.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given đăng ký đang chờ, When Manager phê duyệt, Then tài khoản dùng quyền Staff khi đăng nhập; Staff không thực hiện được thao tác phê duyệt.

**Alternative / Exception Flow:**

- Staff không phê duyệt tài khoản khác; không tự nâng thành Manager hoặc thêm quy trình từ chối chưa chốt.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **duyệt đăng ký để cấp quyền staff** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Chỉ Manager cấp quyền từ đăng ký; không tự gán người phát triển làm Staff/Manager.

**Acceptance Criteria:** Duy xét kết quả theo REQ-016, REQ-017 / AC-016, AC-017 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-022 — Thiết lập Manager đầu tiên

**Loại:** Setup/vận hành/nghiệm thu. **Actor:** Người vận hành được chỉ định.

**Related User Story:** US-020. **Related Requirement / Acceptance:** REQ-016, REQ-029 / AC-016, AC-029.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Thiết lập Manager đầu tiên.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Môi trường được thiết lập; quy trình setup và người thực hiện cần được duyệt.

**Dependencies:**

- Design xác thực/setup; chưa chọn lệnh, script hoặc thông tin bí mật trong story.

**Main Flow:**

1. Người vận hành thực hiện setup theo quy trình được duyệt.
2. Tạo Manager đầu tiên theo cấu hình đã duyệt.
3. Kiểm tra Manager đăng nhập và duyệt Staff được.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given môi trường ban đầu, When thực hiện quy trình setup được duyệt, Then có Manager đăng nhập và phê duyệt nhân viên được; không giả định người đăng ký công khai đầu tiên mặc nhiên thành Manager.

**Alternative / Exception Flow:**

- Không mặc nhiên nâng người đăng ký công khai đầu tiên thành Manager; lệnh/credentials/setup chi tiết chờ Design.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **thiết lập manager đầu tiên** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Tạo trong setup; chưa gán một thành viên cụ thể vào tài khoản sản phẩm.

**Acceptance Criteria:** Duy xét kết quả theo REQ-016, REQ-029 / AC-016, AC-029 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-023 — Khóa/mở khóa Staff và áp dụng quyền mới

**Loại:** Sản phẩm. **Actor:** Manager.

**Related User Story:** US-021. **Related Requirement / Acceptance:** REQ-017 / AC-017.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Khóa/mở khóa Staff và áp dụng quyền mới.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Manager xác thực online, tài khoản Staff tồn tại.

**Dependencies:**

- US-018, US-023; cơ chế thu hồi phiên phải duyệt tại Design.

**Main Flow:**

1. Manager chọn Staff và thao tác khóa hoặc mở.
2. Áp dụng trạng thái quyền của Staff.
3. Giữ nguyên lịch sử công việc.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given Staff đang đăng nhập, When Manager khóa, Then Staff không tiếp tục thao tác bằng phiên hiện tại; When được mở khóa, Then có thể truy cập lại theo xác thực/quyền, lịch sử trước đó còn nguyên.

**Alternative / Exception Flow:**

- Khi khóa, cả phiên đăng nhập hiện có mất quyền. Khi mở được xác thực/truy cập theo quyền, không tự cấp quyền Manager.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **khóa/mở khóa staff và áp dụng quyền mới** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Khóa tác động cả phiên đăng nhập hiện có; không xóa lịch sử công việc.

**Acceptance Criteria:** Duy xét kết quả theo REQ-017 / AC-017 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-024 — Mở hoặc mở lại phiên làm việc cùng ngày

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-022. **Related Requirement / Acceptance:** REQ-018 / AC-018.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Mở hoặc mở lại phiên làm việc cùng ngày.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Xác thực online, có quyền tương ứng.

**Dependencies:**

- US-018; không phải phụ thuộc phải có POI mới mở được phiên.

**Main Flow:**

1. Staff/Manager yêu cầu bắt đầu làm việc.
2. Xác định ngày Việt Nam và phiên của chính người đó.
3. Mở phiên mới nếu chưa có hoặc mở lại cùng phiên đã đóng trong ngày.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given chưa có phiên mở, When gọi thao tác nội dung liên quan, Then chưa được thực hiện; When mở phiên hợp lệ, Then thực hiện theo quyền.
- S2: Given phiên đã đóng tay cùng ngày, When mở lại, Then dùng cùng phiên; phiên còn mở tự đóng lúc 00:00, không tạo hai phiên cho một người cùng ngày.

**Alternative / Exception Flow:**

- Không tạo phiên thứ hai cùng ngày; không mở lại phiên ngày trước. Chưa mở phiên thì các thao tác nội dung liên quan không thực hiện.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **mở hoặc mở lại phiên làm việc cùng ngày** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Một phiên/người/ngày, giờ Việt Nam; mở trước thay đổi nội dung, xử lý và xét duyệt nội dung; đóng tay hoặc 00:00; mở lại cùng phiên cùng ngày.

**Acceptance Criteria:** Duy xét kết quả theo REQ-018 / AC-018 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-025 — Đóng phiên làm việc

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager; tự đóng theo giờ là quy tắc hệ thống.

**Related User Story:** US-022. **Related Requirement / Acceptance:** REQ-018 / AC-018.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Đóng phiên làm việc.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Xác thực online, có quyền tương ứng.

**Dependencies:**

- US-018; không phải phụ thuộc phải có POI mới mở được phiên.

**Main Flow:**

1. Staff/Manager chủ động đóng phiên hiện tại.
2. Chuyển phiên sang đóng theo quy tắc.
3. Ngừng cho thao tác nội dung cần phiên mở.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given chưa có phiên mở, When gọi thao tác nội dung liên quan, Then chưa được thực hiện; When mở phiên hợp lệ, Then thực hiện theo quyền.
- S2: Given phiên đã đóng tay cùng ngày, When mở lại, Then dùng cùng phiên; phiên còn mở tự đóng lúc 00:00, không tạo hai phiên cho một người cùng ngày.

**Alternative / Exception Flow:**

- Phiên còn mở lúc 00:00 Việt Nam tự đóng; có thể mở lại cùng phiên trong cùng ngày qua UC-024, không kéo phiên cũ qua ngày.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **đóng phiên làm việc** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Một phiên/người/ngày, giờ Việt Nam; mở trước thay đổi nội dung, xử lý và xét duyệt nội dung; đóng tay hoặc 00:00; mở lại cùng phiên cùng ngày.

**Acceptance Criteria:** Duy xét kết quả theo REQ-018 / AC-018 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-026 — Xem lịch sử phiên theo quyền

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-023. **Related Requirement / Acceptance:** REQ-019 / AC-019.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xem lịch sử phiên theo quyền.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Xác thực online, có lịch sử thao tác để đọc.

**Dependencies:**

- US-022 và các thao tác US-011–016 để phát sinh lịch sử.

**Main Flow:**

1. Nhân viên yêu cầu xem lịch sử phiên.
2. Lọc dữ liệu theo quyền Staff/Manager.
3. Hiển thị người thời điểm thao tác POI và kết quả.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given thao tác thuộc phiên đã phát sinh, When người dùng xem lịch sử, Then thông tin khớp người/phiên/POI/kết quả, Staff không đọc lịch sử người khác, Manager đọc được theo quyền.

**Alternative / Exception Flow:**

- Staff chỉ xem mình; Manager xem mọi nhân viên; không tự thêm lịch sử vị trí khách hoặc bản diff dữ liệu chưa yêu cầu.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xem lịch sử phiên theo quyền** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Ghi người, thời điểm, thao tác, POI và kết quả; Staff xem mình, Manager xem toàn bộ.

**Acceptance Criteria:** Duy xét kết quả theo REQ-019 / AC-019 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-027 — Xác minh Staff và cấp mã khôi phục

**Loại:** Sản phẩm. **Actor:** Manager.

**Related User Story:** US-024. **Related Requirement / Acceptance:** REQ-020 / AC-020.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xác minh Staff và cấp mã khôi phục.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Manager xác minh đúng nhân viên; online ở các bước thực hiện trên hệ thống.

**Dependencies:**

- US-018; cơ chế xác minh/cấp mã/hạn dùng/lưu bảo mật phải duyệt ở Design.

**Main Flow:**

1. Staff liên hệ Manager yêu cầu khôi phục.
2. Manager xác minh đúng nhân viên theo phương pháp được duyệt.
3. Cấp mã có hạn dùng một lần để Staff đặt mật khẩu.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given mã đúng và còn hiệu lực sau xác minh, When Staff đặt mật khẩu mới, Then có thể đăng nhập với mật khẩu mới; mã đã dùng hoặc hết hạn không đặt lại được lần nữa.

**Alternative / Exception Flow:**

- Không xác minh được thì không cấp mã; thời hạn/cách trao mã chờ Design. Không gửi email/SMS tự động.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xác minh staff và cấp mã khôi phục** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Staff tự đặt mật khẩu mới bằng mã có hạn, dùng một lần; không tự thêm email/SMS tự động.

**Acceptance Criteria:** Duy xét kết quả theo REQ-020 / AC-020 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-028 — Dùng mã khôi phục để đặt mật khẩu mới

**Loại:** Sản phẩm. **Actor:** Staff đang khôi phục truy cập.

**Related User Story:** US-024. **Related Requirement / Acceptance:** REQ-020 / AC-020.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Dùng mã khôi phục để đặt mật khẩu mới.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Manager xác minh đúng nhân viên; online ở các bước thực hiện trên hệ thống.

**Dependencies:**

- US-018; cơ chế xác minh/cấp mã/hạn dùng/lưu bảo mật phải duyệt ở Design.

**Main Flow:**

1. Staff nhập mã khôi phục và mật khẩu mới.
2. Kiểm tra mã đúng còn hạn và chưa dùng.
3. Đặt mật khẩu mới và làm mã không dùng lại được để Staff đăng nhập.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given mã đúng và còn hiệu lực sau xác minh, When Staff đặt mật khẩu mới, Then có thể đăng nhập với mật khẩu mới; mã đã dùng hoặc hết hạn không đặt lại được lần nữa.

**Alternative / Exception Flow:**

- Mã hết hạn/đã dùng không đặt lại được; chính sách mật khẩu và thu hồi token chi tiết chờ Design.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **dùng mã khôi phục để đặt mật khẩu mới** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Staff tự đặt mật khẩu mới bằng mã có hạn, dùng một lần; không tự thêm email/SMS tự động.

**Acceptance Criteria:** Duy xét kết quả theo REQ-020 / AC-020 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-029 — Khôi phục quyền truy cập Manager theo quy trình

**Loại:** Setup/vận hành/nghiệm thu. **Actor:** Người vận hành được chỉ định.

**Related User Story:** US-025. **Related Requirement / Acceptance:** REQ-020 / AC-020.

**Related Feature:** FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Khôi phục quyền truy cập Manager theo quy trình.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có trường hợp mất truy cập cần xử lý và quy trình đã được Duy duyệt.

**Dependencies:**

- Design quy trình vận hành/bảo mật; US-020 cung cấp Manager ban đầu.

**Main Flow:**

1. Người vận hành xác định trường hợp Manager mất truy cập.
2. Thực hiện quy trình phục hồi đã được Duy duyệt.
3. Kiểm tra Manager lấy lại quyền đăng nhập/quản trị và lưu bằng chứng.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given tình huống mất truy cập Manager được kiểm tra, When người được chỉ định thực hiện quy trình đã duyệt, Then Manager lấy lại khả năng đăng nhập/quản trị và có bằng chứng thực hiện đúng quy trình.

**Alternative / Exception Flow:**

- Chưa có quy trình được duyệt thì không tự dùng backdoor hay tự tạo tài khoản quyền cao.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **khôi phục quyền truy cập manager theo quy trình** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Không tự thêm tài khoản cửa hậu hoặc vai trò sản phẩm mới; chưa chọn thao tác kỹ thuật ở đây.

**Acceptance Criteria:** Duy xét kết quả theo REQ-020 / AC-020 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-030 — Xem số khách online hiện tại

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-027. **Related Requirement / Acceptance:** REQ-022 / AC-022.

**Related Feature:** FEAT-006. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xem số khách online hiện tại.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Xác thực online, có tín hiệu hiện diện từ khách kết nối.

**Dependencies:**

- US-018; Design định danh/presence; không yêu cầu phiên làm việc mở chỉ để xem Monitoring.

**Main Flow:**

1. Staff/Manager mở Monitoring online.
2. Lấy số khách theo trình duyệt/thiết bị và trạng thái hiện diện.
3. Hiển thị số hiện tại theo chu kỳ 30 giây.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given nhiều tab cùng trình duyệt và hai thiết bị cùng IP, When dashboard cập nhật, Then tab cùng trình duyệt đếm một và thiết bị khác đếm riêng; khách không còn tín hiệu 90 giây được loại theo timeout và phản ánh khi refresh.

**Alternative / Exception Flow:**

- Nhiều tab một trình duyệt đếm một, thiết bị chung IP đếm riêng; không có tín hiệu 90 giây thì loại theo timeout và phản ánh khi refresh.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xem số khách online hiện tại** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Một trình duyệt/thiết bị một khách; nhiều tab một; không theo IP; refresh 30 giây, hết tín hiệu 90 giây loại khỏi đếm.

**Acceptance Criteria:** Duy xét kết quả theo REQ-022 / AC-022 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-031 — Xem số người trong phiên nghe hiện tại

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-028. **Related Requirement / Acceptance:** REQ-022, REQ-023 / AC-022, AC-023.

**Related Feature:** FEAT-003, FEAT-006. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xem số người trong phiên nghe hiện tại.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Monitoring online; các sự kiện Play/Pause/kết thúc/đóng trang được nhận hoặc timeout áp dụng.

**Dependencies:**

- US-010, US-027; nhiều tab nghe đồng thời còn là chi tiết cần duyệt ở Design.

**Main Flow:**

1. Staff/Manager mở số liệu người nghe.
2. Tổng hợp trạng thái theo Play Pause kết thúc và đóng trang.
3. Hiển thị số phiên nghe hiện tại toàn hệ thống mỗi 30 giây.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given một khách lần lượt Play, Pause rồi nghe hết/đóng trang, When dashboard cập nhật theo chu kỳ 30 giây, Then số đếm tuân thủ đúng vòng đời; không coi khách hoàn toàn offline là tín hiệu realtime đang được nhận.

**Alternative / Exception Flow:**

- Pause vẫn đếm; hết bài/đóng trang bỏ ở refresh tiếp; mất tín hiệu dùng timeout 90 giây. Không đếm tổng lượt tích lũy.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xem số người trong phiên nghe hiện tại** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Bắt đầu đếm từ Play, Pause vẫn đếm; hết bài/đóng trang bỏ ở refresh tiếp theo; mất tín hiệu áp dụng 90 giây. Không phải tổng lượt nghe hoặc số luồng phát ra âm thanh.

**Acceptance Criteria:** Duy xét kết quả theo REQ-022, REQ-023 / AC-022, AC-023 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-032 — Xem sức khỏe phụ thuộc và trạng thái xử lý nội dung

**Loại:** Sản phẩm. **Actor:** Staff hoặc Manager.

**Related User Story:** US-029, US-026. **Related Requirement / Acceptance:** REQ-021, REQ-024 / AC-021, AC-024.

**Related Feature:** FEAT-003, FEAT-005, FEAT-006. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xem sức khỏe phụ thuộc và trạng thái xử lý nội dung.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Xác thực và kết nối online.
- Đang truy cập luồng tương ứng, theo đúng quyền và điều kiện mạng của luồng.

**Dependencies:**

- US-011, US-013; Design cách thu trạng thái backend/MongoDB/worker.
- US-008, US-011, US-013, US-017, US-019.

**Main Flow:**

1. Staff/Manager mở trang tình trạng hệ thống.
2. Đọc trạng thái backend MongoDB Python worker và các công việc.
3. Hiển thị tiến độ thành công thất bại hoặc chờ tương ứng.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given các trạng thái hoạt động/chờ/lỗi được tạo để kiểm tra, When xem dashboard, Then phản ánh đúng trạng thái phụ thuộc và công việc, không coi đầu ra giả lập là tích hợp thật của bản nghiệm thu.
- S2: Given trạng thái một công việc thay đổi, When người dùng kiểm tra tại luồng tương ứng, Then thấy trạng thái phù hợp và biết khi cần chờ/thử lại; không phụ thuộc dịch vụ gửi thông báo tự động.

**Alternative / Exception Flow:**

- Worker không chạy phải thể hiện đúng trạng thái, không giả thành công; cadence sức khỏe/job chi tiết chờ Design, không tự gán 30 giây cho mọi loại status.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xem sức khỏe phụ thuộc và trạng thái xử lý nội dung** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Hiển thị backend, kết nối MongoDB, Python worker, tiến độ/thành công/thất bại dịch/audio; nhịp cập nhật chi tiết sức khỏe/công việc cần cụ thể hóa ở Design.
- Chỉ trạng thái trong app, không email/SMS/push tự động hoặc hộp thông báo lưu trữ mới.

**Acceptance Criteria:** Duy xét kết quả theo REQ-021, REQ-024 / AC-021, AC-024 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-033 — Tạo bản sao database và ảnh/audio đã duyệt

**Loại:** Setup/vận hành/nghiệm thu. **Actor:** Người vận hành được chỉ định.

**Related User Story:** US-031. **Related Requirement / Acceptance:** REQ-026 / AC-026.

**Related Feature:** FEAT-004, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Tạo bản sao database và ảnh/audio đã duyệt.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có dữ liệu và quy trình sao lưu/phục hồi được duyệt; người thực hiện được chỉ định sau.

**Dependencies:**

- US-014–016, US-023; Design công cụ, bảo mật và cách kiểm chứng backup.

**Main Flow:**

1. Người vận hành chuẩn bị trước checkpoint.
2. Sao lưu thủ công DB cùng ảnh/audio đã duyệt ra máy nhóm theo quy trình.
3. Lưu bằng chứng bản sao thuộc checkpoint.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given dữ liệu nằm trong thời gian phải giữ, When vận hành và qua checkpoint, Then không dọn tự động các dữ liệu đó và có bằng chứng bản sao trước checkpoint.
- S2: Given bản sao và quy trình đã duyệt, When thực hiện thử phục hồi trước nghiệm thu cuối, Then có kết quả kiểm chứng khôi phục dữ liệu theo quy trình, không coi sao lưu DB đơn thuần là đã sao lưu tệp media.

**Alternative / Exception Flow:**

- Không coi DB dump đơn thuần là đã sao lưu media; phương pháp/bảo mật chờ Design. Dữ liệu phải giữ không được dọn tự động trong kỳ đã chốt.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **tạo bản sao database và ảnh/audio đã duyệt** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Trong 35 ngày và 7 ngày tối ưu giữ POI xóa logic/media cần phục hồi/nhật ký; sao lưu tay DB và ảnh/audio đã duyệt ra máy nhóm trước mỗi MVP, thử phục hồi ít nhất một lần trước nghiệm thu cuối.

**Acceptance Criteria:** Duy xét kết quả theo REQ-026 / AC-026 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-034 — Thử phục hồi từ bản sao và kiểm chứng kết quả

**Loại:** Setup/vận hành/nghiệm thu. **Actor:** Người vận hành được chỉ định.

**Related User Story:** US-031. **Related Requirement / Acceptance:** REQ-026 / AC-026.

**Related Feature:** FEAT-004, FEAT-005. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Thử phục hồi từ bản sao và kiểm chứng kết quả.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Có dữ liệu và quy trình sao lưu/phục hồi được duyệt; người thực hiện được chỉ định sau.

**Dependencies:**

- US-014–016, US-023; Design công cụ, bảo mật và cách kiểm chứng backup.

**Main Flow:**

1. Người vận hành chọn bản sao và môi trường thử theo quy trình đã duyệt.
2. Thực hiện thử phục hồi DB và media liên quan.
3. Kiểm chứng kết quả và lưu bằng chứng trước nghiệm thu cuối.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given dữ liệu nằm trong thời gian phải giữ, When vận hành và qua checkpoint, Then không dọn tự động các dữ liệu đó và có bằng chứng bản sao trước checkpoint.
- S2: Given bản sao và quy trình đã duyệt, When thực hiện thử phục hồi trước nghiệm thu cuối, Then có kết quả kiểm chứng khôi phục dữ liệu theo quy trình, không coi sao lưu DB đơn thuần là đã sao lưu tệp media.

**Alternative / Exception Flow:**

- Không thử ghi đè môi trường đang dùng bằng quy trình chưa duyệt; kết quả chưa đủ thì không báo phục hồi thành công.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **thử phục hồi từ bản sao và kiểm chứng kết quả** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Trong 35 ngày và 7 ngày tối ưu giữ POI xóa logic/media cần phục hồi/nhật ký; sao lưu tay DB và ảnh/audio đã duyệt ra máy nhóm trước mỗi MVP, thử phục hồi ít nhất một lần trước nghiệm thu cuối.

**Acceptance Criteria:** Duy xét kết quả theo REQ-026 / AC-026 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-035 — Chạy kiểm tra/test/build service qua CI

**Loại:** Setup/vận hành/nghiệm thu. **Actor:** Nhà phát triển khởi phát theo trigger đã duyệt; GitHub Actions thực thi.

**Related User Story:** US-035, US-036. **Related Requirement / Acceptance:** REQ-028, REQ-029, REQ-031, REQ-032 / AC-028, AC-029, AC-031, AC-032.

**Related Feature:** FEAT-001. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Chạy kiểm tra/test/build service qua CI.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Design được duyệt về số lượng/ranh giới, data ownership, hợp đồng giao tiếp và nơi triển khai; đáp ứng ràng buộc miễn phí.
- Có hợp đồng service, quy trình release, checks và quyền/secrets được thiết lập theo Design đã duyệt; chưa có các cấu hình này trong bản tài liệu hiện tại.

**Dependencies:**

- Use Case và Design sẽ lập sau; US-033 về miễn phí, US-036 về CI/CD. Chưa ấn định số service hoặc tự giao công việc cho thành viên.
- US-035, US-032–034; Docker/Compose, GitHub Actions và hosting đã được chọn trước. Chưa chọn registry hoặc cơ chế rollback.

**Main Flow:**

1. Trigger được duyệt khởi phát workflow cho revision/service liên quan.
2. GitHub Actions thực hiện kiểm tra test và build theo cấu hình đã duyệt.
3. Ghi kết quả và artifact/revision đạt điều kiện cho bước phát hành.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given thiết kế microservices đã duyệt, When build/chạy/phát hành một service theo phương án đó, Then có bằng chứng service chạy riêng/giao tiếp đúng hợp đồng và phát hành riêng mà không bắt buộc phát hành lại toàn bộ backend; các luồng liên quan vẫn được kiểm tra. Chỉ chia thư mục không đủ bằng chứng.
- S2: Given workflow/trigger/checks đã duyệt, When có revision cần xử lý, Then có run thực tế kiểm tra/test/build theo service liên quan; nếu kiểm tra thất bại, workflow không phát hành revision đó như bản đạt.
- S3: Given kiểm tra đạt và đủ gate phát hành đã duyệt, When release được kích hoạt theo chế độ đã chọn, Then có artifact/revision và bằng chứng deployment tương ứng, kiểm tra được kết quả service sau phát hành.

**Alternative / Exception Flow:**

- Checks thất bại không phát hành revision đó như bản đạt; không tự thêm registry hoặc paid runner. Trigger/checks chi tiết chờ Design.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **chạy kiểm tra/test/build service qua ci** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Giữ stack Express.js và worker Python đã chốt; không thêm vai trò sản phẩm/feature du khách; vẫn giữ yêu cầu offline và chất lượng của các story gốc.
- CI/CD không bỏ qua gate Waterfall; không triển khai revision thất bại như bản đạt và không kích hoạt trả phí để chạy pipeline. CI tự động; CD tự triển khai khi checks/gate đã duyệt đạt theo DEC-046, không yêu cầu duyệt tay từng lần.

**Acceptance Criteria:** Duy xét kết quả theo REQ-028, REQ-029, REQ-031, REQ-032 / AC-028, AC-029, AC-031, AC-032 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-036 — Triển khai service tự động khi checks/gate đạt

**Loại:** Setup/vận hành/nghiệm thu. **Actor:** Trigger phát hành đã duyệt; GitHub Actions/hosting thực thi.

**Related User Story:** US-035, US-036. **Related Requirement / Acceptance:** REQ-028–032 / AC-028–032.

**Related Feature:** FEAT-001. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Triển khai service tự động khi checks/gate đạt.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Design được duyệt về số lượng/ranh giới, data ownership, hợp đồng giao tiếp và nơi triển khai; đáp ứng ràng buộc miễn phí.
- Có hợp đồng service, quy trình release, checks và quyền/secrets được thiết lập theo Design đã duyệt; chưa có các cấu hình này trong bản tài liệu hiện tại.

**Dependencies:**

- Use Case và Design sẽ lập sau; US-033 về miễn phí, US-036 về CI/CD. Chưa ấn định số service hoặc tự giao công việc cho thành viên.
- US-035, US-032–034; Docker/Compose, GitHub Actions và hosting đã được chọn trước. Chưa chọn registry hoặc cơ chế rollback.

**Main Flow:**

1. Nhận revision/artifact đã đạt checks và đủ gate release đã duyệt.
2. Workflow tự triển khai service theo topology được duyệt.
3. Kiểm tra kết quả service và ghi bằng chứng revision/deployment.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given thiết kế microservices đã duyệt, When build/chạy/phát hành một service theo phương án đó, Then có bằng chứng service chạy riêng/giao tiếp đúng hợp đồng và phát hành riêng mà không bắt buộc phát hành lại toàn bộ backend; các luồng liên quan vẫn được kiểm tra. Chỉ chia thư mục không đủ bằng chứng.
- S2: Given workflow/trigger/checks đã duyệt, When có revision cần xử lý, Then có run thực tế kiểm tra/test/build theo service liên quan; nếu kiểm tra thất bại, workflow không phát hành revision đó như bản đạt.
- S3: Given kiểm tra đạt và đủ gate phát hành đã duyệt, When release được kích hoạt theo chế độ đã chọn, Then có artifact/revision và bằng chứng deployment tương ứng, kiểm tra được kết quả service sau phát hành.

**Alternative / Exception Flow:**

- Không thêm duyệt tay từng deploy; không bỏ gate phase. Khi deploy lỗi không báo đạt; cách rollback chờ Design. Phải chứng minh từ Day 5.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **triển khai service tự động khi checks/gate đạt** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- Giữ stack Express.js và worker Python đã chốt; không thêm vai trò sản phẩm/feature du khách; vẫn giữ yêu cầu offline và chất lượng của các story gốc.
- CI/CD không bỏ qua gate Waterfall; không triển khai revision thất bại như bản đạt và không kích hoạt trả phí để chạy pipeline. CI tự động; CD tự triển khai khi checks/gate đã duyệt đạt theo DEC-046, không yêu cầu duyệt tay từng lần.

**Acceptance Criteria:** Duy xét kết quả theo REQ-028–032 / AC-028–032 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

## UC-037 — Xét bằng chứng và nghiệm thu checkpoint

**Loại:** Setup/vận hành/nghiệm thu. **Actor:** Duy.

**Related User Story:** US-034. **Related Requirement / Acceptance:** REQ-030 / AC-030.

**Related Feature:** FEAT-001. Các feature ghi dạng khoảng trong story nguồn vẫn áp dụng toàn khoảng.

**Goal:** Xét bằng chứng và nghiệm thu checkpoint.

**Trigger:** Actor khởi phát mục tiêu nêu trên; riêng CI/CD và tự đóng phiên dùng trigger/điều kiện đã duyệt, không tự chọn event hoặc lịch mới.

**Preconditions:**

- Deliverable từng bước được chuẩn bị; Requirement/Design phải duyệt trước code ứng dụng.

**Dependencies:**

- Các story sản phẩm; kế hoạch milestone chi tiết, phân công và evidence được trình ở bước sau.

**Main Flow:**

1. Duy nhận bản chạy và evidence checkpoint.
2. Đối chiếu phạm vi quality gate các AC và lỗi còn tồn tại.
3. Ghi kết quả xét đạt hoặc các điểm chưa đạt.

**Các tình huống hành vi nguồn cần bảo toàn:**

- S1: Given checkpoint đến hạn, When Duy xét bằng chứng và bản chạy, Then việc đánh dấu hoàn thành dựa trên phạm vi thực tế và gates; không thay bằng dữ liệu thu hẹp/dịch vụ giả rồi báo đạt.
- S2: Given kỹ thuật/tiến độ không đáp ứng mục tiêu, When phát hiện vấn đề, Then trình rủi ro và đề xuất ảnh hưởng để Duy quyết định; không tự thay requirement hoặc deadline. Mốc Day 5 và offline vẫn chưa có bằng chứng khả thi tại thời điểm soạn story.

**Alternative / Exception Flow:**

- Có Critical/Blocker không đánh dấu hoàn tất; Day 5 đủ 15 POI 16 ngôn ngữ tích hợp thật microservices CI/CD. Không tự giảm scope hoặc kéo deadline khi chưa đáp ứng.
- Không đủ quyền hoặc điều kiện nghiệp vụ thì không thực hiện thao tác trái quyền; không coi lỗi/chờ là hoàn tất. Các nhánh nguồn chỉ áp dụng khi thuộc mục tiêu/actor UC này.

**Postconditions:** Khi thành công, đạt mục tiêu **xét bằng chứng và nghiệm thu checkpoint** và đáp ứng AC nguồn tương ứng. Khi không thành công, không coi mục tiêu là hoàn tất; giữ các bất biến nghiệp vụ bên dưới.

**Business Rules:**

- 35 ngày lịch 22/10–25/11/2026; Day 5/10/15/20/25/30/35 có bản chạy. Day 5 đủ 15 POI/16 ngôn ngữ/tích hợp thật; tuần 26/11–02/12 chỉ tối ưu; Critical/Blocker không đánh dấu đạt.

**Acceptance Criteria:** Duy xét kết quả theo REQ-030 / AC-030 và các tình huống nguồn ở trên, chỉ trong phạm vi mục tiêu/actor của UC này. Chưa có bằng chứng kiểm thử đạt.

