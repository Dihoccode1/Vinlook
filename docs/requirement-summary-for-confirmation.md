# REQUIREMENT READY FOR CONFIRMATION — Vinlook

Ngày tổng hợp: 23/10/2026. Trạng thái: **ĐÃ ĐƯỢC DUY XÁC NHẬN TỔNG THỂ**, theo DEC-043 ngày 23/10/2026; được dùng làm cơ sở soạn PRD. PRD và Design cần được xét duyệt riêng.

Nguồn: các quyết định DEC-001 đến DEC-042 trong [Decision Log](decision-log.md). Đây là bản tổng hợp khảo sát để xác nhận yêu cầu, chưa phải PRD, thiết kế, backlog hoặc kế hoạch đã được duyệt. Những lựa chọn đã duyệt được giữ nguyên; bản tổng hợp không tự thêm chức năng hoặc lựa chọn kỹ thuật.

## 1. Mục tiêu, người dùng và nền tảng

- Vinlook là đồ án xây dựng nền tảng du lịch TP.HCM, hỗ trợ du khách trong nước và nước ngoài khám phá địa điểm qua GPS, bản đồ tương tác và thuyết minh đa ngôn ngữ. Vấn đề trọng tâm là rào cản tiếng Việt đối với khách nước ngoài và khả năng sử dụng khi Internet yếu hoặc mất hoàn toàn.
- Mobile-first web app, hỗ trợ Chrome trên Android và Safari trên iPhone. Du khách không cần đăng nhập.
- Phạm vi bản đồ/offline là toàn TP.HCM theo ranh giới hành chính hiện tại, gồm các khu vực sáp nhập và Côn Đảo; dữ liệu nội dung ban đầu có 15 POI được chọn, không đồng nghĩa phải biên soạn mọi điểm du lịch trong thành phố.
- Duy là Team Lead, người duyệt các phase và nghiệm thu cuối. Vai trò này không tự gán Duy làm Manager trong ứng dụng.

## 2. Sáu nhóm chức năng bắt buộc

| Nhóm | Phạm vi đã duyệt |
|---|---|
| FEAT-001 Bản đồ/GPS | Xác định vị trí, hiển thị bản đồ và POI, tìm kiếm POI, gợi ý các POI gần nhất. |
| FEAT-002 Dẫn đường | Đi bộ tới một POI được chọn, theo dõi vị trí khi màn hình Vinlook đang mở, chỉ dẫn bằng chữ/hình, tính lại khi đi lệch; hoạt động cả offline. |
| FEAT-003 Dịch/thuyết minh | Nguồn tiếng Anh; nhân viên chủ động chạy dịch và tạo audio cho 16 ngôn ngữ, kiểm tra, trình duyệt trước công khai. |
| FEAT-004 Dữ liệu POI | Lưu thông tin, tọa độ, thumbnail, nội dung và audio; quản lý bản nháp/bản công khai, đánh dấu xóa và khôi phục. Không còn bán kính riêng cho từng POI. |
| FEAT-005 Admin | Staff/Manager, đăng ký và phê duyệt tài khoản, phiên làm việc hằng ngày, nội dung, duyệt/công khai và nhật ký thao tác. |
| FEAT-006 Monitoring | Số khách online, số người trong phiên nghe thuyết minh hiện tại trên toàn hệ thống; trạng thái backend, MongoDB, Python worker và công việc dịch/audio. |

Tất cả sáu nhóm đều must-have. Không tự gán thứ tự ưu tiên kinh doanh giữa chúng.

## 3. Khám phá và dẫn đường

- Hai cách chọn đích: tìm kiếm POI hoặc chọn trong danh sách gợi ý gần vị trí hiện tại.
- Gợi ý tối đa **4 POI gần nhất trong bán kính 3 km theo đường thẳng**. Có ít hơn thì hiển thị đúng số tìm được; không tự mở rộng bán kính. Độ dài tuyến đi bộ thực tế có thể vượt 3 km.
- Dẫn đến từng POI riêng lẻ. Không có lộ trình ghép nhiều điểm hoặc chỉnh sửa hành trình nhiều chặng.
- Chỉ dẫn bằng chữ/hình trên màn hình; không yêu cầu giọng nói chỉ đường hoặc tiếp tục dẫn đường khi chuyển ứng dụng/tắt màn hình.
- Không cấp GPS: vẫn xem bản đồ, tìm POI, nghe và tải dữ liệu; gợi ý theo vị trí và dẫn đường cần quyền GPS.
- Không tìm được đường: thông báo và cho phép thử lại hoặc chọn POI khác.
- Mất GPS giữa đường: giữ tuyến và vị trí cuối cùng, thông báo GPS không khả dụng; cập nhật trở lại khi có GPS. Không trình bày vị trí cũ như vị trí hiện tại.
- Không lưu lịch sử di chuyển vào database ứng dụng. Monitoring không hiển thị vị trí từng du khách.

## 4. Nội dung và ngôn ngữ

15 POI: Dinh Độc Lập; Nhà thờ Đức Bà Sài Gòn; Bưu Điện Trung Tâm Sài Gòn; Nhà hát Thành phố; Bến Nhà Rồng; Bảo tàng Chứng tích Chiến tranh; Bảo tàng Lịch sử Việt Nam tại TP.HCM; Bảo tàng Mỹ thuật TP.HCM; Landmark 81; Bitexco; Thảo Cầm Viên Sài Gòn; Phố đi bộ Nguyễn Huệ; Phố Tây Bùi Viện; Địa đạo Củ Chi **khu Bến Dược**; Chùa Bà Thiên Hậu.

16 ngôn ngữ online, áp dụng cho giao diện du khách, mô tả và audio:

1. Tiếng Anh — ngôn ngữ nguồn.
2. Tiếng Trung Quan Thoại — chữ phồn thể.
3. Tiếng Hindi.
4. Tiếng Tây Ban Nha.
5. Tiếng Ả Rập chuẩn.
6. Tiếng Pháp.
7. Tiếng Bengali.
8. Tiếng Bồ Đào Nha — biến thể Bồ Đào Nha.
9. Tiếng Indonesia.
10. Tiếng Urdu.
11. Tiếng Nga.
12. Tiếng Đức.
13. Tiếng Nhật.
14. Nigerian Pidgin.
15. Tiếng Ả Rập Ai Cập.
16. Tiếng Việt.

- Mỗi bài thuyết minh theo POI/ngôn ngữ dài **90–150 giây**, mục tiêu khoảng 2 phút.
- Chọn POI để xem thông tin; bấm **Play** để phát, không tự phát theo GPS hoặc khi vừa chọn POI.
- Nhân viên hoàn tất chỉnh sửa rồi chủ động chạy pipeline; không chạy theo mỗi lần gõ/sửa.
- Staff kiểm tra nội dung; chỉ Manager duyệt/công khai. Manager được duyệt chính bản sửa của mình.
- Chỉ công khai khi đủ nội dung và audio đã duyệt cho cả 16 ngôn ngữ. Khi sửa, bản công khai cũ tiếp tục phục vụ trong lúc bản mới chờ xử lý/duyệt.
- Lỗi một phần: giữ kết quả thành công, cho phép chạy lại phần lỗi, giữ nguyên điều kiện công khai đủ 16 ngôn ngữ.
- Máy MMS tắt: công việc liên quan chờ máy hoạt động lại. Hết quota miễn phí: tạm dừng, hiển thị nguyên nhân, giữ kết quả và cho nhân viên thử lại khi có quota. Không tự chuyển sang trả phí.
- Admin và Monitoring dùng tiếng Anh.

## 5. Offline

- Cho phép chuẩn bị và tải trước khi có Internet.
- Sau khi tải hoàn chỉnh, **đóng rồi mở lại khi không có Internet vẫn phải xem bản đồ, tìm POI, dùng GPS/dẫn đường và nghe thuyết minh**; mô tả và hình POI cũng phải có trong dữ liệu offline đã chuẩn bị.
- Giao diện, mô tả và audio offline chỉ dùng **tiếng Anh**. Các chức năng Admin, Monitoring và tạo nội dung cần Internet.
- Mất mạng khi dùng ngôn ngữ khác: chuyển giao diện/mô tả sang tiếng Anh, báo offline; dừng audio ngôn ngữ khác, người dùng bấm Play để nghe bản tiếng Anh đã tải.
- Báo khi có bản dữ liệu mới; người dùng chủ động tải. Chỉ báo sẵn sàng offline khi tải đủ. Tải/cập nhật lỗi: giữ gói cũ nếu có, báo chưa hoàn tất và cho thử lại; giữ gói cũ đến khi bản thay thế hoàn chỉnh.
- POI đã đánh dấu xóa có thể còn trong gói hoàn toàn mất mạng. Khi kết nối lại và đồng bộ trạng thái xóa, ẩn khỏi bản đồ, tìm kiếm và gợi ý.
- Tổng dung lượng, cơ chế lưu trữ/đồng bộ và bộ máy tính đường sẽ được chốt ở Design bằng phương án và bằng chứng khả thi.

## 6. Tài khoản, phân quyền và phiên làm việc

- Đăng ký nhân viên: họ tên, email, mật khẩu, xác nhận mật khẩu; chờ Manager duyệt. Đăng nhập bằng email và mật khẩu.
- Tạo Manager đầu tiên khi thiết lập hệ thống. Không tự gán các thành viên phát triển vào vai trò sản phẩm.
- Cả Staff và Manager: mở phiên làm việc hằng ngày, thêm/sửa bản nháp POI, chạy pipeline, kiểm tra/trình duyệt nội dung và xem Monitoring.
- Chỉ Manager: duyệt/công khai, đánh dấu xóa/khôi phục POI, duyệt đăng ký, khóa/mở khóa tài khoản Staff.
- Mỗi người một phiên làm việc/ngày. Phải mở phiên trước các thao tác nội dung, chạy pipeline hoặc xét duyệt. Đóng thủ công hoặc tự đóng lúc 00:00 theo giờ Việt Nam; cho mở lại cùng phiên trong cùng ngày.
- Nhật ký ghi người, thời điểm, thao tác, POI liên quan và kết quả. Staff xem lịch sử phiên của mình; Manager xem tất cả nhân viên.
- Khóa Staff thu hồi quyền cả với phiên đăng nhập đang tồn tại; giữ lịch sử công việc.
- Quên mật khẩu Staff: Manager xác minh, cấp mã khôi phục có hạn/dùng một lần, Staff tự đặt mật khẩu mới. Khôi phục quyền Manager bằng quy trình vận hành do Duy duyệt ở Design.
- Thông báo/trạng thái nằm trong ứng dụng; không gửi email, SMS hoặc push tự động. Chưa có yêu cầu một hộp thông báo lưu trữ riêng.

## 7. Monitoring

- Một trình duyệt trên một thiết bị tính là một khách. Nhiều tab cùng trình duyệt tính một; không đếm theo IP.
- Cập nhật dashboard mỗi **30 giây**; số liệu hiện tại trên toàn hệ thống, không phải báo cáo lịch sử khách theo phiên làm việc nhân viên.
- Người nghe được tính từ lúc bấm Play; **tạm dừng vẫn được tính**; nghe hết hoặc đóng trang thì bỏ khỏi số hiện tại ở lần cập nhật tiếp theo.
- Nếu không còn tín hiệu trình duyệt trong **90 giây**, loại khỏi số khách online và số người nghe. Khách offline không thể cung cấp số liệu trực tuyến thời gian thực.
- Hiển thị trạng thái backend, kết nối MongoDB, Python worker, tiến độ/thành công/thất bại của công việc dịch/audio.

## 8. Bảo toàn dữ liệu và hiệu năng

- Xóa POI là đánh dấu xóa, giữ bản ghi trong database. Chỉ Manager khôi phục; khôi phục về nháp và duyệt lại trước khi công khai.
- Trong 35 ngày và 7 ngày tối ưu, giữ POI đã đánh dấu xóa, nội dung/ảnh/audio cần khôi phục và nhật ký phiên; không tự động dọn dữ liệu này.
- Sao lưu thủ công database và ảnh/audio đã duyệt ra máy nhóm trước mỗi mốc MVP; ít nhất một lần thử khôi phục trước nghiệm thu cuối. Phương pháp do Duy duyệt trong Design.
- Tải nghiệm thu tối đa **50 du khách đồng thời**. Với ít nhất 95% thao tác đo: bản đồ tương tác trong 10 giây; tìm kiếm/gợi ý trong 2 giây; audio bắt đầu trong 3 giây sau Play; tính/tính lại đường đi bộ trong 5 giây.
- Điều kiện đo: backend đã thức, có dữ liệu/GPS cần thiết, mạng ổn định với thao tác online. Tải gói offline và thời gian đánh thức backend được đo riêng. Chấp nhận Render Free đánh thức khoảng một phút. Đây là mục tiêu, chưa có kiểm thử ứng dụng chứng minh đạt.

## 9. Công nghệ và điều kiện chi phí

- React 19, Tailwind CSS 4, shadcn; Express.js; MongoDB/Mongoose; JWT/RBAC.
- Docker/Docker Compose; GitHub Actions; frontend Vercel, backend Render; hai môi trường Development và Production.
- Atlas Free; Cloudinary Free; MapLibre GL JS và Protomaps PMTiles cho bản đồ/đóng gói dữ liệu hiển thị.
- Gemini Developer API Free Tier cho dịch; Azure Speech F0 cho các ngôn ngữ yêu cầu được hỗ trợ; Meta MMS cho Nigerian Pidgin trên Python worker chạy ở máy nhóm có 16 GB RAM. Express vẫn là backend chính.
- **Chỉ dùng dịch vụ miễn phí**, không kích hoạt trả phí hoặc tự động nâng cấp. Việc chọn dịch vụ chưa chứng minh mọi biến thể ngôn ngữ, quota hoặc tích hợp đều đáp ứng được.
- PlantUML cho sơ đồ; Vitest, Supertest và Playwright cho kiểm thử tương ứng. Vẫn kiểm thử điện thoại thật: Galaxy A35 5G/Chrome và iPhone 13/Safari là hai mốc đại diện được chọn theo ủy quyền.
- GitHub là trung tâm quản lý: https://github.com/Dihoccode1/Vinlook . Chi tiết branch/Issue/Project/milestone và phân công sẽ trình duyệt trong các bước kế tiếp; không giả định chúng đã được tạo.

## 10. Nhóm, thời gian và quy trình

- Nhóm ba người: Duy (Dihoccode1), Tú (ngoctu0405), Hạo (2107h06); mỗi người 8 giờ/ngày, cần hỗ trợ xuyên suốt. Duy là Team Lead. Các vai trò công việc khác chưa phân công.
- Kinh nghiệm đã cung cấp: Duy có ứng dụng todo/ecommerce và biết stack dự kiến; Tú có tool tự điền Google Form và chưa có kinh nghiệm backend; Hạo biết HTML/CSS, chưa có dự án làm bằng chứng. Không suy ra năng lực kiểm thử/DevOps từ tên công nghệ.
- **35 ngày lịch: 22/10–25/11/2026**, bao gồm khảo sát và thiết kế. **26/11–02/12/2026** chỉ tối ưu hiệu năng/giao diện, không hoàn thành bù chức năng must-have.
- Waterfall toàn dự án: Requirement → Design → Implementation → Testing → Deployment → Maintenance. Duy duyệt Requirement và Design trước code ứng dụng; các bản chạy trong Implementation không thay thế nghiệm thu Testing/Deployment chính thức.
- MVP là breadth-complete, depth-minimal executable prototype. Các checkpoint Day 5/10/15/20/25/30/35 tương ứng 26/10, 31/10, 05/11, 10/11, 15/11, 20/11 và 25/11.
- **Từ Day 5 đã phải có đủ 15 POI, 16 ngôn ngữ và tích hợp thật**, không thay bằng dữ liệu thu hẹp hoặc dịch vụ giả lập. Chưa có bằng chứng hoàn thành/khả thi mốc này. Nội dung cụ thể các milestone sau cần trình duyệt khi lập kế hoạch.
- Ngày 35 phải đáp ứng toàn bộ yêu cầu và tiêu chí đã duyệt. Không đánh dấu hoàn thành khi còn lỗi Critical/Blocker.
- Sau xác nhận tổng thể: bắt đầu PRD → User Story → Use Case và các tài liệu/thiết kế theo Master Prompt; duy trì traceability, phê duyệt các lựa chọn rồi mới lập backlog/phân công/kế hoạch theo thứ tự đã thống nhất.

## 11. Các nội dung đã loại hoặc giới hạn rõ

- Không có hành trình nhiều POI, bán kính riêng từng POI, tự phát audio theo GPS hoặc chỉ đường bằng giọng nói.
- Không yêu cầu dẫn đường khi chuyển ứng dụng/tắt màn hình.
- Không yêu cầu đăng nhập du khách, lịch sử di chuyển, thống kê lịch sử khách theo phiên nhân viên, Admin offline hoặc tạo nội dung offline.
- Không có email/SMS/push tự động, Staging riêng hoặc dịch vụ trả phí.
- Các giới hạn này xuất phát từ những lựa chọn đã duyệt, không thay đổi tính must-have của sáu nhóm chức năng còn lại.

## 12. Bằng chứng hiện có và rủi ro còn mở

Đã có: Decision Log; nghiên cứu 15 mô tả nguồn tiếng Anh dạng ngắn; đánh giá tài liệu HTML tham khảo; khảo sát dịch vụ; đo thực tế bản đồ PMTiles **32,09 MB** và nguồn đường OSM thô **12,74 MB**. Xem [báo cáo đo](research/offline-data-measurement.md). Ước tính audio 10,8–18 MB chỉ là phép tính giả định 64 kbit/s cho 15 bài, không phải số đo tệp cuối.

Tại thời điểm xác nhận yêu cầu, chưa có: PRD/thiết kế đã duyệt, ứng dụng, pipeline tích hợp thật, 240 bài audio đã duyệt, kiểm thử GPS/offline/hiệu năng trên điện thoại, backup/restore đã chạy hoặc deployment do phiên làm việc này tạo. Bản mô tả tiếng Anh hiện có cần mở rộng thành kịch bản đúng thời lượng; tọa độ điểm vào và thumbnail cần chuẩn bị/kiểm tra.

Các việc phải chốt trong Design theo DEC-042: bộ máy/đồ thị tính đường offline, bắt vị trí lên đường và chỉ dẫn; lưu trữ/phân phối/cập nhật gói cùng tổng dung lượng và điều kiện đo; bảo mật đăng nhập/thu hồi quyền/khôi phục Manager; cách sao lưu và kiểm tra phục hồi; kiến trúc, schema và hợp đồng API. Những chi tiết UX, tham số kỹ thuật hoặc trường hợp biên chưa được quyết định phải được trình duyệt khi cần, không tự bổ sung.

**Rủi ro trọng yếu:** offline walking/rerouting chưa được chứng minh khả thi; 16 biến thể ngôn ngữ và quota miễn phí chưa được kiểm chứng đầy đủ; mục tiêu đầy đủ ngay Day 5 còn phụ thuộc phê duyệt hai phase và các đầu vào chưa hoàn tất. Việc xác nhận yêu cầu không đồng nghĩa các rủi ro này đã được giải quyết hoặc tiến độ được bảo đảm. Nếu không đáp ứng được, phải trình vấn đề và đề xuất thay đổi để Duy quyết định, không tự giảm phạm vi.

## Kết quả xác nhận

Duy đã xác nhận bản tổng hợp này làm cơ sở soạn PRD và các bước tiếp theo theo Master Prompt (DEC-043). Xác nhận này **không phê duyệt trước** những lựa chọn Design, phân công, milestone chi tiết hoặc kế hoạch chưa được trình.

## Bổ sung sau xác nhận — DEC-045, 23/10/2026

Duy đã duyệt PRD v1.0 và US-001–034, đồng thời yêu cầu backend xây dựng theo hướng **microservices có CI/CD**. Giữ Express.js, MongoDB/Mongoose, worker Python, Docker/Compose, GitHub Actions và các ràng buộc chi phí/thời hạn nếu chưa có quyết định khác. Chưa chốt số/ranh giới service, dữ liệu, giao tiếp, topology triển khai hoặc mức tự động hóa CD. [CR-001](changes/CR-001-backend-microservices-cicd.md) ghi ảnh hưởng và các điểm cần duyệt; [PRD v1.1](PRD.md) và [User Stories v1.1](user-stories.md) đánh dấu riêng các AC/story bổ sung chờ review. Xác nhận hướng mới không đồng nghĩa kiến trúc/triển khai đã có hoặc các phần bổ sung đã được duyệt chi tiết.

**Cập nhật DEC-046:** Duy chọn microservices/CI-CD phải có ngay **Day 5 (26/10/2026)** và **CD tự động sau khi checks/gate phát hành đã duyệt đạt**. Hai điểm này đã chốt, thay cho trạng thái còn mở khi ghi DEC-045. Ranh giới service, dữ liệu, giao tiếp, topology và cấu hình trigger/checks/release vẫn chờ Design. Bước tiếp theo là duyệt đề xuất ánh xạ User Story sang Use Case trước khi tạo đặc tả chi tiết.
