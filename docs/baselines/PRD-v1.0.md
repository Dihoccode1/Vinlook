# Vinlook — Product Requirements Document

Phiên bản: **1.0 — ĐÃ ĐƯỢC DUY DUYỆT**, DEC-044 ngày 23/10/2026. Ngày soạn: 23/10/2026.

Cơ sở: [Requirement Summary đã xác nhận](../requirement-summary-for-confirmation.md), [Decision Log](../decision-log.md). Duy xác nhận yêu cầu tổng thể tại DEC-043 và phê duyệt PRD v1.0 tại DEC-044. Người xác nhận tài liệu và nghiệm thu: **Duy / Dihoccode1**.

## 1. Tổng quan sản phẩm

### Vấn đề và mục tiêu

Khách du lịch nước ngoài gặp rào cản tiếng Việt khi tìm hiểu các điểm tham quan tại TP.HCM. Internet hạn chế hoặc mất kết nối làm gián đoạn việc khám phá, nghe thuyết minh và dẫn đường.

Vinlook là web app mobile-first giúp khách trong nước và nước ngoài tìm POI trên bản đồ, khám phá địa điểm gần vị trí hiện tại, đi bộ đến từng POI và nghe nội dung đa ngôn ngữ. Sau khi chuẩn bị dữ liệu online, khách có thể tiếp tục sử dụng các chức năng du lịch bằng tiếng Anh khi offline, kể cả đóng rồi mở lại ứng dụng.

Mục tiêu của đồ án là phần mềm chạy được, bao phủ sáu nhóm chức năng chính với độ sâu tối thiểu đủ chứng minh luồng nghiệp vụ end-to-end. Không có chỉ tiêu doanh thu, tăng trưởng người dùng hoặc tỷ lệ chuyển đổi được duyệt; không tự thêm KPI kinh doanh.

### Người dùng và các bên liên quan

| Đối tượng | Nhu cầu / trách nhiệm |
|---|---|
| Du khách trong nước/nước ngoài | Khám phá, chọn điểm, đi bộ, xem/nghe nội dung, chuẩn bị dữ liệu offline; không cần tài khoản. |
| Staff | Soạn nội dung, chạy pipeline, kiểm tra/trình duyệt, làm việc trong phiên hằng ngày và xem Monitoring. |
| Manager | Các việc của Staff; duyệt/công khai nội dung, quản lý phê duyệt/khóa Staff, xóa logic/khôi phục POI, xem lịch sử mọi nhân viên. |
| Duy | Team Lead, người duyệt yêu cầu/phase và nghiệm thu cuối; không mặc nhiên là Manager trong sản phẩm. |
| Duy, Tú, Hạo | Nhóm phát triển; mỗi người 8 giờ/ngày, cần hỗ trợ xuyên suốt. Chưa phân công các vai trò công việc khác. |

### Phạm vi và ranh giới

- Bản đồ và dữ liệu offline bao phủ TP.HCM theo ranh giới hành chính hiện tại, gồm các khu vực sáp nhập và Côn Đảo; nội dung tuyển chọn ban đầu có 15 POI tại mục 5.
- Chrome trên Android và Safari trên iPhone. Hai mốc kiểm thử đại diện: Galaxy A35 5G/Chrome và iPhone 13/Safari; đây chưa phải kết quả kiểm thử hoặc danh sách duy nhất được hỗ trợ.
- Sáu nhóm chức năng đều **Must-have**. Không tự đặt thứ tự ưu tiên tương đối giữa các nhóm.
- Ngoài phạm vi đã xác nhận: hành trình nhiều điểm; bán kính riêng cho POI; tự phát thuyết minh theo GPS; giọng nói chỉ đường; dẫn đường nền/khi tắt màn hình; tài khoản du khách; lưu lịch sử di chuyển; báo cáo lịch sử khách theo phiên nhân viên; Admin/pipeline offline; email/SMS/push tự động; Staging riêng và dịch vụ trả phí.

## 2. Danh mục yêu cầu và tiêu chí chấp nhận

Các ID REQ/AC dưới đây được cấp cho yêu cầu đã xác nhận; không tạo thêm chức năng. AC mô tả hành vi cần nghiệm thu, **chưa được kiểm thử đạt**. Các tham số kỹ thuật chưa chốt được ghi ở mục 8, không tự gán giá trị mặc định.

### FEAT-001 — Bản đồ, GPS và khám phá POI

- **Mô tả:** Bản đồ và các POI, vị trí hiện tại, tìm điểm và gợi ý gần người dùng.
- **Giá trị:** Giúp khách xác định nơi muốn tham quan và tìm nội dung phù hợp vị trí.
- **Ưu tiên:** Must-have.
- **Phụ thuộc:** FEAT-004 cung cấp POI công khai/tọa độ/ảnh; REQ-007–009 cung cấp hành vi offline. Có GPS để gợi ý theo vị trí.
- **Nguồn:** DEC-005–013, DEC-028, DEC-033, DEC-036, DEC-039.

| Yêu cầu | Nội dung | Tiêu chí chấp nhận |
|---|---|---|
| REQ-001 | Mobile-first, phạm vi toàn TP.HCM hiện tại, 15 POI ban đầu; truy cập du khách không cần đăng nhập, trên hai họ trình duyệt đã chọn. | **AC-001:** Với dữ liệu hợp lệ, khách không đăng nhập mở được bản đồ và thông tin 15 POI trên Chrome Android/Safari iPhone; phạm vi dữ liệu không bị thu hẹp về nội thành cũ hoặc chỉ quanh POI. |
| REQ-002 | Xác định/hiển thị GPS; nếu không cho quyền vẫn xem bản đồ, tìm POI, nghe và tải dữ liệu, còn gợi ý theo vị trí/dẫn đường cần GPS. | **AC-002:** Khi cấp quyền và có vị trí, bản đồ hiển thị vị trí; khi từ chối quyền, các chức năng không cần GPS vẫn dùng được và điều kiện cần GPS được thông báo khi gọi chức năng liên quan. |
| REQ-003 | Danh sách tối đa 4 POI gần nhất trong 3 km đường thẳng; ít hơn thì hiển thị đúng số, không tự nới bán kính. | **AC-003:** Với tập POI và vị trí kiểm tra xác định, danh sách đúng thứ tự gần nhất và tối đa 4 kết quả trong 3 km; trường hợp không có/ít hơn 4 không được bù bằng POI ngoài bán kính. |

### FEAT-002 — Dẫn đường đi bộ đến một POI

- **Mô tả:** Tìm kiếm/chọn POI hoặc chọn từ gợi ý, rồi dẫn đến riêng điểm đó bằng đường đi bộ.
- **Giá trị:** Giúp khách tiếp cận địa điểm ngay cả khi mất Internet.
- **Ưu tiên:** Must-have.
- **Phụ thuộc:** FEAT-001, FEAT-004; dữ liệu và bộ máy tính đường offline cần duyệt/kiểm chứng trong Design.
- **Nguồn:** DEC-006, DEC-010–013, DEC-028, DEC-035–036.

| Yêu cầu | Nội dung | Tiêu chí chấp nhận |
|---|---|---|
| REQ-004 | Tìm POI và chọn đích từ tìm kiếm hoặc gợi ý; mỗi lần dẫn tới một POI. Tuyến đi bộ có thể dài hơn 3 km. | **AC-004:** Khách tìm được POI, chọn được từ cả hai luồng và nhận tuyến đi bộ tới điểm đã chọn; không yêu cầu ghép nhiều chặng hoặc giới hạn chiều dài tuyến bằng bán kính gợi ý. |
| REQ-005 | Theo dõi vị trí khi màn hình Vinlook đang mở, chỉ dẫn chữ/hình và tính lại khi lệch tuyến, online và offline. | **AC-005:** Với dữ liệu đầy đủ, GPS khả dụng và tuyến đi bộ kiểm tra hợp lệ, khách nhận chỉ dẫn cập nhật khi di chuyển và tuyến tính lại khi lệch; lặp lại được khi mất mạng. Không yêu cầu giọng nói chỉ đường hoặc hoạt động nền. |
| REQ-006 | Không có tuyến: báo và cho thử lại/chọn khác. Mất GPS: giữ tuyến và vị trí cuối, thông báo mất GPS, cập nhật khi trở lại. | **AC-006:** Các tình huống kiểm tra không có tuyến/mất GPS cho kết quả đúng quy tắc; không trình bày tọa độ cũ như vị trí hiện tại. |

### FEAT-003 — Dịch và thuyết minh đa ngôn ngữ

- **Mô tả:** Tạo nội dung/audio từ nguồn tiếng Anh, kiểm tra và công khai theo điều kiện đủ ngôn ngữ.
- **Giá trị:** Giảm rào cản tiếng Việt, tạo quy trình chuẩn bị nội dung có người chịu trách nhiệm duyệt.
- **Ưu tiên:** Must-have.
- **Phụ thuộc:** FEAT-004 lưu nội dung; FEAT-005 quản lý quyền/phiên/duyệt; các dịch vụ và worker đã chọn cần kiểm chứng tích hợp, ngôn ngữ và quota.
- **Nguồn:** DEC-014–015, DEC-017, DEC-023, DEC-026, DEC-028, DEC-030–033.

| Yêu cầu | Nội dung | Tiêu chí chấp nhận |
|---|---|---|
| REQ-010 | Đủ 16 ngôn ngữ cho giao diện khách online, mô tả và audio; tiếng Anh nguồn; audio mỗi POI/ngôn ngữ 90–150 giây, bấm Play để phát. | **AC-010:** Với mỗi POI đã công khai, khách chọn được 16 ngôn ngữ/biến thể tại mục 5, xem đúng nội dung và phát đúng audio đạt thời lượng; chọn POI/GPS không tự phát. |
| REQ-011 | Staff/Manager kết thúc chỉnh sửa rồi chủ động chạy dịch/audio. | **AC-011:** Lưu/sửa nội dung chưa tự khởi động xử lý; người có quyền và phiên mở chủ động chạy được pipeline và xem trạng thái. |
| REQ-012 | Staff kiểm tra/trình duyệt; chỉ Manager duyệt/công khai đủ 16 ngôn ngữ; được duyệt bản tự sửa; giữ bản công khai cũ khi bản mới đang xử lý. | **AC-012:** Thiếu nội dung/audio hoặc phê duyệt cho bất kỳ ngôn ngữ nào thì bản sửa chưa công khai; bản cũ vẫn phục vụ. Khi đủ điều kiện, Manager công khai được; Staff không tự công khai được. |
| REQ-013 | Giữ kết quả thành công và chạy lại phần lỗi; chờ worker khi máy tắt; hết quota thì dừng, báo nguyên nhân, cho thử lại khi có quota, không trả phí. | **AC-013:** Các tình huống lỗi từng phần, worker không hoạt động và hết quota được thử có kiểm soát; thành công cũ không mất, nội dung công khai không gián đoạn vì bản mới đang chờ, không bỏ qua cổng duyệt 16 ngôn ngữ. |

### FEAT-004 — Dữ liệu và vòng đời POI

- **Mô tả:** Lưu thông tin/tọa độ/thumbnail, nội dung theo ngôn ngữ và audio, bản nháp/bản công khai và vòng đời xóa logic.
- **Giá trị:** Cung cấp dữ liệu thống nhất cho bản đồ, pipeline, duyệt và offline, bảo toàn khả năng phục hồi.
- **Ưu tiên:** Must-have.
- **Phụ thuộc:** FEAT-005 cho quyền, phiên và duyệt; schema/lưu media/phiên bản cụ thể chốt ở Design. Quan hệ giữa các feature là phụ thuộc nghiệp vụ, không phải thứ tự chia task.
- **Nguồn:** DEC-007–009, DEC-018, DEC-023, DEC-032–033, DEC-041.

| Yêu cầu | Nội dung | Tiêu chí chấp nhận |
|---|---|---|
| REQ-014 | Lưu dữ liệu POI, tọa độ, thumbnail, mô tả/audio theo ngôn ngữ, tách được bản nháp và bản đã công khai; không có bán kính riêng từng POI. | **AC-014:** Thông tin được lưu và đọc lại nhất quán cho 15 POI; thay đổi bản nháp không thay nội dung khách đang sử dụng trước khi công khai. Có dữ liệu ảnh/tọa độ/nội dung tương ứng; không tự thêm trường schema chưa duyệt. |
| REQ-015 | Chỉ Manager đánh dấu xóa, giữ bản ghi; chỉ Manager khôi phục về nháp và duyệt lại đủ ngôn ngữ trước công khai. | **AC-015:** Sau xóa logic, bản ghi vẫn tồn tại và POI không phục vụ như điểm công khai sau đồng bộ; Staff bị từ chối thao tác. Manager khôi phục được nhưng không tự bỏ qua bước duyệt/công khai lại. |

### FEAT-005 — Admin, tài khoản và phiên làm việc

- **Mô tả:** Hai vai trò Staff/Manager, đăng ký được phê duyệt, phiên hằng ngày, nhật ký, phục hồi và khóa tài khoản. Giao diện tiếng Anh.
- **Giá trị:** Xác định người thực hiện công việc và người chịu trách nhiệm nội dung được công khai.
- **Ưu tiên:** Must-have.
- **Phụ thuộc:** FEAT-003/004 là đối tượng thao tác; xác thực JWT/RBAC đã chọn, cơ chế chi tiết cần duyệt trong Design.
- **Nguồn:** DEC-016–019, DEC-023, DEC-029, DEC-033, DEC-039–040.

| Yêu cầu | Nội dung | Tiêu chí chấp nhận |
|---|---|---|
| REQ-016 | Đăng ký họ tên/email/mật khẩu/xác nhận mật khẩu, chờ Manager duyệt; đăng nhập email+mật khẩu. Manager đầu tiên tạo khi setup. | **AC-016:** Mật khẩu xác nhận không khớp bị từ chối; tài khoản chờ chưa được truy cập Staff; Manager duyệt rồi tài khoản đăng nhập đúng quyền. Quy trình setup tạo được Manager ban đầu. |
| REQ-017 | Staff/Manager được soạn, xử lý, kiểm tra/trình duyệt, xem Monitoring; Manager riêng được duyệt/công khai, xóa/khôi phục, duyệt/khóa/mở Staff. Khóa có hiệu lực cả khi đã đăng nhập. | **AC-017:** Kiểm tra từng hành động với hai vai trò và tài khoản chờ/khóa; hành động chỉ dành Manager không thực hiện được bằng quyền Staff. Staff bị khóa mất quyền ở phiên hiện tại; mở khóa không làm mất lịch sử. |
| REQ-018 | Một phiên/người/ngày, mở trước thao tác nội dung/pipeline/xét duyệt; đóng tay hoặc 00:00 giờ Việt Nam, mở lại cùng phiên trong ngày. | **AC-018:** Chưa mở phiên thì thao tác liên quan không được thực hiện; không tạo phiên thứ hai cùng ngày; đóng tay, mở lại và chuyển ngày vận hành đúng quy tắc. |
| REQ-019 | Nhật ký: ai, thời điểm, thao tác, POI liên quan và kết quả. Staff xem phiên mình, Manager xem mọi nhân viên. | **AC-019:** Các thao tác POI được ghi đúng phiên với thông tin đã chốt; Staff không xem lịch sử nhân viên khác, Manager xem được. |
| REQ-020 | Manager xác minh Staff rồi cấp mã phục hồi có hạn/dùng một lần để Staff đặt mật khẩu mới; Manager phục hồi qua quy trình vận hành do Duy duyệt. | **AC-020:** Mã hợp lệ cho đặt mật khẩu mới; mã hết hạn/đã dùng không dùng lại được; quy trình phục hồi Manager được duyệt và kiểm tra. Thời hạn và cơ chế kỹ thuật phải chốt ở Design. |
| REQ-021 | Trạng thái duyệt tài khoản, pipeline và cập nhật offline hiển thị trong ứng dụng; không gửi email/SMS/push tự động. | **AC-021:** Người dùng xem được trạng thái liên quan trong ứng dụng; không cần tích hợp gửi tự động để hoàn tất các luồng đã duyệt. Không tự thêm hộp thông báo lưu trữ. |

### FEAT-006 — Monitoring

- **Mô tả:** Theo dõi hiện trạng sử dụng toàn hệ thống, sức khỏe phụ thuộc và xử lý nội dung; giao diện tiếng Anh, cần Internet.
- **Giá trị:** Giúp nhân viên theo dõi hoạt động và nhận biết công việc xử lý đang chờ/lỗi.
- **Ưu tiên:** Must-have.
- **Phụ thuộc:** Các sự kiện khách/audio, trạng thái pipeline/worker/backend/MongoDB; quyền FEAT-005. Giao thức, định danh và lưu presence chưa chọn.
- **Nguồn:** DEC-019–022, DEC-031, DEC-033, DEC-035, DEC-039.

| Yêu cầu | Nội dung | Tiêu chí chấp nhận |
|---|---|---|
| REQ-022 | Khách = trình duyệt/thiết bị; nhiều tab tính một, không theo IP. Refresh 30 giây; mất tín hiệu 90 giây thì loại khỏi đếm online/nghe. | **AC-022:** Nhiều tab một trình duyệt vẫn một khách; hai thiết bị chung IP vẫn hai. Dashboard theo chu kỳ 30 giây; bản ghi hết thời gian hiện diện được loại theo timeout 90 giây và phản ánh khi refresh. |
| REQ-023 | Người nghe tính từ Play, giữ khi Pause, bỏ khi nghe hết/đóng trang; đây là số hiện tại toàn hệ thống. | **AC-023:** Kiểm tra Play → Pause → kết thúc và đóng trang: số liệu đúng vòng đời đã chốt, cập nhật theo chu kỳ. Không gọi số này là số luồng đang phát ra âm thanh hoặc tổng lượt nghe tích lũy. |
| REQ-024 | Hiển thị backend, MongoDB, Python worker, tiến độ/thành công/thất bại dịch/audio. | **AC-024:** Với các trạng thái hoạt động, chờ và lỗi được kiểm tra, dashboard hiển thị trạng thái phụ thuộc/công việc tương ứng; không giả lập thành công thay cho tích hợp runtime thật ở checkpoint. |

### Các yêu cầu dùng chung

| Yêu cầu | Nội dung | Tiêu chí chấp nhận |
|---|---|---|
| REQ-007 | Sau tải đủ, các chức năng du lịch hoạt động offline và mở lại được: bản đồ/POI/ảnh/mô tả, tìm/gợi ý, GPS, tính và tính lại đường, audio; chỉ tiếng Anh. | **AC-007:** Tải đủ gói khi online, đóng ứng dụng, ngắt Internet, mở lại rồi thực hiện các luồng tương ứng trên hai họ trình duyệt/điện thoại; không cần backend để chạy các luồng du lịch này. GPS/quyền và dữ liệu phải khả dụng. |
| REQ-008 | Người dùng chủ động tải bản mới sau thông báo; chỉ báo sẵn sàng khi đủ; tải lỗi giữ bản cũ và cho thử lại. | **AC-008:** Ngắt tải/cập nhật giữa chừng không làm gói cũ mất khả năng dùng; không báo hoàn tất khi thiếu dữ liệu; khi bản mới đủ mới thay thế. |
| REQ-009 | Mất mạng ở ngôn ngữ khác: chuyển UI/text sang Anh và báo offline, dừng audio khác, bấm Play nghe Anh; xóa POI đồng bộ khi có mạng. Admin/Monitoring/pipeline cần online. | **AC-009:** Luồng chuyển offline đúng quy tắc với gói tiếng Anh đã tải; POI xóa có thể còn ở máy mất mạng nhưng bị ẩn khỏi bản đồ/tìm/gợi ý sau kết nối và đồng bộ. Không yêu cầu nhân viên sửa dữ liệu offline. |
| REQ-025 | Không lưu lịch sử di chuyển vào database và không hiển thị vị trí từng khách trên Monitoring. | **AC-025:** Rà dữ liệu ứng dụng và giao diện Monitoring không có lịch sử di chuyển hoặc vị trí cá nhân được thêm trái yêu cầu. Không dùng quy tắc này để khẳng định hạ tầng bên thứ ba không xử lý metadata. |
| REQ-026 | Giữ POI xóa logic/media cần phục hồi/nhật ký trong 35 ngày và 7 ngày tối ưu; sao lưu tay DB và ảnh/audio đã duyệt ra máy nhóm trước mỗi MVP; thử phục hồi ít nhất một lần trước nghiệm thu cuối. | **AC-026:** Không có dọn tự động dữ liệu thuộc thời gian lưu; có bản sao và bằng chứng thực hiện trước từng checkpoint, cùng kết quả thử phục hồi theo quy trình được duyệt. Không suy ra quyền xóa vật lý POI sau thời gian này. |
| REQ-027 | Tối đa 50 khách đồng thời; ít nhất 95% thao tác đạt ngưỡng tại mục 6, chấp nhận cold start khoảng một phút được đo riêng. | **AC-027:** Có kết quả đo theo từng loại thao tác trên điều kiện/kịch bản được duyệt; không dùng số đo trích xuất bản đồ trên desktop thay cho hiệu năng ứng dụng/điện thoại. |
| REQ-028 | Chỉ miễn phí; hết quota dừng/chờ, không tự nâng cấp hoặc sử dụng trả phí. | **AC-028:** Cấu hình dịch vụ và xử lý quota tuân thủ ràng buộc; không kích hoạt tính phí để vượt giới hạn hoặc tuyên bố quota miễn phí là vô hạn. |
| REQ-029 | Dùng stack/công cụ/môi trường đã chọn tại mục 7; quyết định chưa chốt cần Duy duyệt ở Design. | **AC-029:** Tài liệu triển khai/cấu hình và phần mềm khớp lựa chọn đã duyệt; mọi đề xuất thay đổi có phê duyệt trước, không tự thay backend/provider/kiến trúc để xử lý khó khăn. |
| REQ-030 | 35 ngày lịch, Waterfall toàn dự án, mỗi 5 ngày có bản chạy; Day 5 đủ 15 POI/16 ngôn ngữ/tích hợp thật; Day 35 nghiệm thu đủ. | **AC-030:** Mỗi checkpoint có bản chạy và bằng chứng phạm vi thực tế; Requirement/Design được duyệt trước code ứng dụng. Không đánh dấu đạt khi thiếu chức năng, dùng tích hợp giả thay cho thật, hoặc còn Critical/Blocker. Tuần sau chỉ tối ưu. |

Nguồn yêu cầu dùng chung: REQ-007–009 từ DEC-006, 028, 032, 036, 039; REQ-025 từ DEC-039; REQ-026 từ DEC-018, 041; REQ-027 từ DEC-027, 034; REQ-028–029 từ DEC-005, 024–026, 042; REQ-030 từ DEC-001–004, 038 và Master Prompt được người dùng cung cấp.

## 3. Ma trận quyền sản phẩm

| Hành động | Staff | Manager |
|---|---|---|
| Mở/đóng/mở lại phiên cùng ngày | Có, phiên của mình | Có, phiên của mình |
| Thêm/sửa nháp, chạy pipeline, kiểm tra/trình duyệt | Có, cần phiên mở | Có, cần phiên mở |
| Duyệt/công khai nội dung, kể cả bản tự sửa | Không | Có, cần phiên mở |
| Đánh dấu xóa/khôi phục POI | Không | Có; thao tác nội dung cần phiên mở |
| Xem Monitoring | Có | Có |
| Xem nhật ký phiên | Của mình | Tất cả nhân viên |
| Duyệt đăng ký, khóa/mở Staff, hỗ trợ phục hồi Staff | Không | Có |

Ma trận diễn đạt quyền đã chốt, không phải danh sách API hoặc schema RBAC. Chưa có quyết định về giao quyền Manager cho nhân viên cụ thể hoặc quyền quản trị Manager khác.

## 4. Quy tắc dữ liệu và tích hợp

- Dữ liệu nghiệp vụ cần có: thông tin POI, tọa độ điểm đến, thumbnail, mô tả/audio theo ngôn ngữ, bản nháp/công khai, trạng thái xóa logic; thông tin nhân viên/duyệt/khóa; phiên hằng ngày và nhật ký; trạng thái xử lý/hiện diện cần cho dashboard. Đây là thông tin yêu cầu, không phải entity/field/relationship đã thiết kế.
- Tọa độ điểm vào và hình cần được chuẩn bị/kiểm tra. 15 đoạn mô tả tiếng Anh hiện có là bản nghiên cứu ngắn, cần mở rộng và kiểm tra thời lượng giọng đọc.
- Có thể giữ gói offline cũ đến khi bản mới tải đủ. Khả năng lưu đồng thời và dung lượng tải/lưu/RAM cần đo riêng trong Design.
- Lỗi một ngôn ngữ không làm mất kết quả tốt của ngôn ngữ khác; không làm bản mới vượt qua điều kiện công khai.
- Không lưu mật khẩu xác nhận như một giá trị mật khẩu bổ sung; cơ chế lưu mật khẩu, token và thu hồi quyền cần trình duyệt trước khi thực hiện.

## 5. Danh mục nội dung bắt buộc

### POI ban đầu — 15 điểm

1. Dinh Độc Lập.
2. Nhà thờ Đức Bà Sài Gòn.
3. Bưu Điện Trung Tâm Sài Gòn.
4. Nhà hát Thành phố.
5. Bến Nhà Rồng.
6. Bảo tàng Chứng tích Chiến tranh.
7. Bảo tàng Lịch sử Việt Nam tại TP.HCM.
8. Bảo tàng Mỹ thuật TP.HCM.
9. Landmark 81.
10. Bitexco.
11. Thảo Cầm Viên Sài Gòn.
12. Phố đi bộ Nguyễn Huệ.
13. Phố Tây Bùi Viện.
14. Địa đạo Củ Chi — **Bến Dược**.
15. Chùa Bà Thiên Hậu.

### Ngôn ngữ online — 16, bao gồm nguồn tiếng Anh

Tiếng Anh; tiếng Trung Quan Thoại **chữ phồn thể**; Hindi; Tây Ban Nha; Ả Rập chuẩn; Pháp; Bengali; Bồ Đào Nha **biến thể Bồ Đào Nha**; Indonesia; Urdu; Nga; Đức; Nhật; **Nigerian Pidgin**; **Ả Rập Ai Cập**; Việt.

16 ngôn ngữ áp dụng cho UI du khách online, mô tả và audio; offline chỉ Anh; Admin/Monitoring dùng Anh. Không thay Nigerian Pidgin bằng tiếng Anh giọng Nigeria, hoặc gộp hai biến thể Ả Rập. Với 15 POI, phạm vi cuối cần 240 phiên bản mô tả và 240 audio tương ứng, gồm nội dung tiếng Anh nguồn; chưa có các đầu ra đó được duyệt.

## 6. Chất lượng và nghiệm thu

### Hiệu năng đã duyệt

| Thao tác | Ngưỡng cho ít nhất 95% thao tác đo |
|---|---:|
| Bản đồ sẵn sàng tương tác | ≤10 giây |
| Tìm kiếm/gợi ý POI | ≤2 giây |
| Bắt đầu audio từ Play | ≤3 giây |
| Tính/tính lại tuyến đi bộ | ≤5 giây |

Tải tối đa 50 du khách đồng thời. Điều kiện: backend đã thức, có dữ liệu và GPS cần thiết, mạng ổn định cho thao tác online. Tải gói offline và cold start Render Free khoảng một phút tách riêng. Phiên bản trình duyệt, điều kiện mạng, mẫu đo và công cụ kiểm thử tải chưa được tự chọn tại PRD này; cần cụ thể hóa trong Design/Test Plan trước khi đo.

### Bằng chứng cần có

Kiểm thử từ AC sang Test Case ở bước sau; dùng Vitest/Supertest/Playwright theo lựa chọn đã duyệt. Kiểm tra tích hợp thật và kiểm thử GPS, audio, lưu trữ, đóng/mở lại offline trên điện thoại thật. Không coi mobile emulation hoặc kiểm tra cấu trúc tệp PMTiles là bằng chứng thay thế các luồng này.

Duy xác nhận kết quả nghiệm thu. Không đánh dấu MVP hoàn tất khi còn lỗi Critical/Blocker; không xem AI output là đã đúng. Mẫu test, phân loại lỗi chi tiết, trách nhiệm review và checklist sẽ trình trong các tài liệu kế tiếp theo Master Prompt.

## 7. Ràng buộc công nghệ, nhóm và lịch

### Lựa chọn đã duyệt

| Phần | Lựa chọn |
|---|---|
| Frontend/backend | React 19, Tailwind CSS 4, shadcn; Express.js |
| Database/xác thực | MongoDB/Mongoose; JWT/RBAC |
| Container/CI | Docker, Docker Compose, GitHub Actions |
| Hosting/môi trường | Vercel frontend, Render backend; Development và Production |
| Lưu trữ | Atlas Free database; Cloudinary Free ảnh/audio |
| Bản đồ hiển thị | MapLibre GL JS, Protomaps PMTiles |
| Dịch/TTS | Gemini Developer API Free Tier; Azure Speech F0 ở các ngôn ngữ yêu cầu được hỗ trợ; Meta MMS cho Nigerian Pidgin trên local Python worker, máy nhóm có 16 GB RAM |
| Tài liệu/kiểm thử | PlantUML; Vitest, Supertest, Playwright; kiểm thử điện thoại thật |

Chọn nhà cung cấp không chứng minh tích hợp, đủ quota hoặc hỗ trợ/chất lượng mọi ngôn ngữ. Express là backend chính; Python worker bổ sung cho MMS. Không tự đổi stack hoặc bật chi phí để xử lý hạn chế.

### Nhóm và trách nhiệm hiện có

Duy (Dihoccode1): Team Lead; đã có todo/ecommerce, biết stack dự kiến. Tú (ngoctu0405): có tool tự điền Google Form, chưa có kinh nghiệm backend. Hạo (2107h06): HTML/CSS, chưa có dự án làm bằng chứng. Mỗi người 8 giờ/ngày, cần hỗ trợ mọi phần. Chưa phân công frontend/backend/testing/DevOps/documentation; chưa ước lượng effort hoặc assign Issue.

### Các mốc cố định — không phải kế hoạch công việc

| Mốc | Ngày |
|---|---|
| Day 1 | 22/10/2026 |
| Day 5 | 26/10/2026 — đủ 15 POI, 16 ngôn ngữ, tích hợp thật |
| Day 10 / 15 / 20 | 31/10, 05/11, 10/11/2026 |
| Day 25 / 30 | 15/11, 20/11/2026 |
| Day 35 | 25/11/2026 — đầy đủ must-have và tiêu chí nghiệm thu |
| Tối ưu sau nghiệm thu | 26/11–02/12/2026 — chỉ hiệu năng/UI |

35 ngày lịch bao gồm khảo sát và thiết kế. Waterfall toàn dự án: Requirement → Design → Implementation → Testing → Deployment → Maintenance. Requirement/Design cần Duy duyệt trước code ứng dụng; checkpoint bản chạy trong Implementation không thay cho nghiệm thu Testing/Deployment. Scope chi tiết các milestone sau và công việc theo ngày chưa được khóa tại PRD.

GitHub là trung tâm quản lý: [Dihoccode1/Vinlook](https://github.com/Dihoccode1/Vinlook). Issue/PR/branch/Project/milestone chỉ được ghi là thực tế khi có bằng chứng. PRD này chưa tạo các đối tượng đó; chiến lược nhánh, phân công và kế hoạch cần trình duyệt ở bước tương ứng.

## 8. Các quyết định còn mở và rủi ro

Các mục này được chuyển sang Design theo DEC-042; giữ nguyên yêu cầu sản phẩm trong khi đánh giá.

| Mục | Điều cần trình Duy duyệt | Liên quan |
|---|---|---|
| Dẫn đường offline | Engine, đồ thị đi bộ, quyền truy cập đường, kết nối mạng đường, bắt GPS lên đường, chỉ dẫn và bằng chứng tính/tính lại trên điện thoại. | REQ-004–007, 027 |
| Gói offline | Nơi phân phối, tổng dung lượng, font/style/icon/app assets, lưu trữ/cập nhật/đồng bộ; dung lượng khi giữ gói cũ và mới; điều kiện đo tải. | REQ-007–009, 027–029 |
| Ngôn ngữ/quota | Khả năng sinh và chất lượng đúng biến thể, giọng đọc, thời lượng, tài khoản/quota thực tế và phối hợp worker. | REQ-010–013, 028 |
| Bảo mật và tài khoản | Cơ chế mật khẩu/JWT, xác minh, mã phục hồi/thời hạn, thu hồi quyền, quy trình phục hồi Manager. | REQ-016–020, 025 |
| Thiết kế dữ liệu/tích hợp | Kiến trúc, schema/quan hệ/trường kỹ thuật, versioning, API contract và điều phối công việc/presence. | REQ-011–024, 029 |
| Sao lưu/kiểm chứng | Công cụ/phương pháp, lưu bản sao an toàn và cách chứng minh khôi phục; kịch bản đo và Test Plan. | REQ-026–027 |

Các chi tiết UX/trường hợp biên chưa được quyết định phải trình khi cần; PRD không ngầm đặt giá trị cho cách trả lại ngôn ngữ khi có mạng, destination đang dẫn bị xóa, xử lý nhiều tab nghe đồng thời hoặc các tham số kỹ thuật khác.

**Rủi ro trọng yếu:** offline walking/rerouting chưa có bằng chứng khả thi; hỗ trợ/chất lượng 16 ngôn ngữ và quota chưa kiểm chứng; Day 5 đầy đủ dữ liệu và tích hợp phụ thuộc các phase được duyệt cùng nội dung/hạ tầng chưa có. Không cam kết đạt chỉ bằng việc ghi yêu cầu. Nếu đánh giá không đáp ứng được, trình vấn đề và đề xuất thay đổi/ảnh hưởng để Duy quyết định; không tự giảm scope hoặc kéo deadline.

## 9. Hiện trạng bằng chứng và traceability

- **ACTUAL:** xác nhận tổng thể DEC-043; [bản nghiên cứu mô tả nguồn](../content/poi-descriptions-en.md), [đánh giá HTML tham khảo](../references/quan4-reference-review.md), [khảo sát dịch vụ](../research/free-service-options.md), [phép đo dữ liệu](../research/offline-data-measurement.md).
- **ACTUAL:** bản đồ PMTiles trích theo đa giác 32,09 MB, dữ liệu đường thô 12,74 MB. Đường thô không phải graph đi bộ cuối cùng. Audio 10,8–18 MB là ước tính theo giả định 64 kbit/s, không phải tệp cuối; chưa có tổng gói hoàn chỉnh được duyệt.
- **ACTUAL:** PRD v1.0 đã được Duy duyệt theo DEC-044. User Story được chuẩn bị trong tài liệu riêng với trạng thái review riêng.
- **CHƯA CÓ BẰNG CHỨNG TỪ CÔNG VIỆC NÀY:** app, tích hợp runtime, 240 audio được duyệt, test app đạt, backup/restore đã chạy, deployment hoặc các Issue/PR đã tạo.

Traceability của PRD: DEC → REQ → FEAT → AC. REQ-001–030 có đủ AC-001–030 tương ứng; các yêu cầu dùng chung áp dụng theo phụ thuộc đã mô tả. Bước tiếp theo là [User Story](user-stories-v1.0.md), có trạng thái xét duyệt riêng. Use Case, diagram, task, Test Case và deployment sẽ nối ID ở từng bước, không gán liên kết giả hoặc tự tách Use Case khi cần Duy xác nhận.

## 10. Kiểm soát phê duyệt

| Tài liệu/gate | Trạng thái |
|---|---|
| Requirement Summary | Duy xác nhận, DEC-043 ngày 23/10/2026 |
| PRD v1.0 | Duy phê duyệt, DEC-044 ngày 23/10/2026 |
| User Story | Được phép soạn theo DEC-044; xem trạng thái tại tài liệu riêng |
| Use Case và tài liệu sau | Chưa tạo |
| Design/Implementation/Testing/Deployment | Chưa được phê duyệt hoàn thành |

Bản PRD đủ để review khi phản ánh baseline, có ID/feature/giá trị/ưu tiên/phụ thuộc/AC và phân biệt điều đã chốt với Design còn mở. Sau khi Duy duyệt tài liệu, tiếp tục User Story theo thứ tự Master Prompt. Mọi thay đổi yêu cầu sau khi thiết kế/triển khai bắt đầu phải có đề xuất và phân tích ảnh hưởng được duyệt; không tự áp dụng.
