# Vinlook — D-003: xác thực, nhật ký xuyên service và giao nhận công việc

Ngày: 23/10/2026. **ĐÃ DUYỆT theo DEC-053, với thay đổi sang bcrypt**. Không tạo code/schema/API trong bước này.

Nguồn nghiệp vụ: [PRD](PRD.md), [Use Cases](use-cases.md), [D-002 đã duyệt](design-data-communication-proposal.md), DEC-051/052 trong [Decision Log](decision-log.md). Ba service Express có database riêng về logic, giao tiếp REST/HTTPS; worker local lấy việc qua POI & Content. Không bổ sung broker/gateway hoặc dịch vụ có phí.

## D-003.1 — JWT trong bộ nhớ tab và kiểm tra quyền hiện tại

### Cơ chế đã duyệt

- Identity & Staff cấp và xác minh JWT của nhân viên; mật khẩu băm bằng **bcrypt**, không lưu dạng rõ hoặc mật khẩu xác nhận bổ sung.
- Access JWT có hạn **2 giờ**, chỉ giữ trong bộ nhớ tab; không lưu token vào localStorage, sessionStorage hoặc IndexedDB. Gửi Bearer token qua HTTPS cho thao tác cần quyền. Bản đầu không có refresh token; reload tab hoặc hết hạn thì đăng nhập lại.
- Đăng nhập lại không tự tạo phiên làm việc thứ hai. Phiên hằng ngày là dữ liệu nghiệp vụ trong Identity, độc lập với thời gian sống token.
- Trước mỗi thao tác API cần quyền nhân viên, service xác minh qua Identity trạng thái tài khoản/quyền hiện tại; trước thao tác nội dung còn kiểm tra phiên đang mở. Không dùng bản cache quyền dương giữa các request để tiếp tục cho Staff đã khóa truy cập.
- Không xác minh được quyền do Identity không khả dụng thì không cho thao tác cần quyền đó tiếp tục. Các chức năng công khai/du khách offline vẫn theo yêu cầu riêng, không bị buộc đăng nhập hoặc phụ thuộc Identity.

**Trade-off:** Ít trạng thái refresh và không cần dựa vào cookie xuyên domain Vercel/Render cho luồng này, nhưng nhân viên phải đăng nhập lại khi reload/hết 2 giờ. Kiểm tra Identity tăng số lần gọi service, độ trễ và phụ thuộc khả dụng; phải đo với môi trường miễn phí, không coi ngưỡng hiệu năng đã đạt.

**Giới hạn:** Bộ nhớ tab không ngăn được XSS lúc ứng dụng đang chạy. Chưa chọn thư viện JWT, thuật toán ký, key rotation, chính sách mật khẩu/rate limit, CORS hoặc credential giữa các service/worker. Cách xử lý request đã qua kiểm tra trước thời điểm khóa nhưng đang thực thi cần được đặc tả khi duyệt API; không khẳng định đã có cơ chế hủy giao dịch đang chạy hoặc dừng job cũ bằng việc khóa tài khoản.

**Căn cứ:** Bcrypt được chọn theo yêu cầu Duy tại DEC-053. Giới hạn 72 byte và cost cần duyệt được trình tại [D-004](design-data-model-proposal.md). Hạn JWT 2 giờ là lựa chọn Vinlook, không phải quy định OWASP.**Phương án khác:** Access token ngắn hạn kèm refresh token và cơ chế cookie/proxy đã được kiểm chứng sẽ giảm việc đăng nhập lại, nhưng tăng state thu hồi, token rotation và kiểm thử Safari/cross-origin. Chưa chọn phương án này, không tự thêm proxy hoặc custom domain có phí.

**Truy vết:** US-018/021/022/024; UC-020/023/024/027/028 và các UC nội dung; REQ-016–020, REQ-029.

## D-003.2 — Nhật ký bền vững qua transactional outbox

### Vấn đề

POI & Content sở hữu thay đổi POI, nhưng Identity & Staff sở hữu nhật ký phiên. Nếu lưu POI xong rồi gọi API nhật ký thất bại, một HTTP request đơn thuần không tự làm hai lần ghi dữ liệu trở thành giao dịch nguyên tử. Không được giải quyết bằng việc POI service ghi trực tiếp database của Identity.

### Cơ chế đã duyệt

1. Sau khi quyền/phiên đã được kiểm tra, POI & Content lưu thay đổi nghiệp vụ và một thông điệp nhật ký cần gửi **trong cùng transaction thuộc database của chính nó**. Chỉ commit khi cả hai phần ghi nội bộ thành công.
2. Sau commit, POI & Content gửi thông điệp qua REST/HTTPS tới Identity. Phần gửi có thể chạy trong process POI & Content khi service đang hoạt động; không thêm service/broker riêng và không tự ping để né sleep.
3. Identity ghi nhật ký theo mã sự kiện duy nhất. Gửi lặp cùng sự kiện không tạo hai dòng nhật ký. Chỉ đánh dấu đã gửi sau xác nhận tiếp nhận; nếu mất kết nối thì giữ để gửi lại.
4. Nhật ký tham chiếu nhân viên, phiên gốc, POI, thời điểm/thao tác/kết quả tương ứng. Việc nhận thông điệp chậm không chuyển thao tác sang phiên của ngày khác hoặc buộc mở lại phiên cũ.
5. Các thao tác nội dung do POI & Content thực hiện, gồm tạo job/thử lại/duyệt/công khai/xóa/khôi phục theo phạm vi nhật ký đã chốt, phải được rà trong cơ chế này; công việc do Identity sở hữu có thể ghi nhật ký nội bộ theo schema được duyệt sau.

**Kết quả đã chấp nhận tại DEC-053:** Nếu Identity gặp lỗi sau khi thay đổi đã commit, nhật ký ở Identity có thể **hiển thị chậm** đến khi gửi thành công. Sự kiện còn bền vững tại POI & Content, không được bỏ qua như đã ghi xong. Không tuyên bố giao dịch xuyên hai service là nguyên tử hoặc truyền tin exactly-once; mục tiêu là lưu bền vững và tác động tiếp nhận không trùng.

**Lợi ích:** Không mất ý định ghi nhật ký khi có lỗi giữa hai lần ghi; giữ ranh giới database. **Chi phí:** Thêm nơi lưu thông điệp chờ gửi, trạng thái gửi, nhận chống trùng, xử lý gửi lại và kiểm tra phục hồi. Tên collection, trường/id, indexes, thứ tự sự kiện, thời gian lưu, retry/backoff và cách quan sát tồn đọng sẽ trình trong data model/API; không tự thêm các trường đó vào schema chính thức.

**Phương án khác:** Chỉ gọi API nhật ký đồng bộ ít thành phần hơn, nhưng phải có cách phục hồi riêng cho tình huống POI commit rồi API nhật ký lỗi; rollback bằng một lệnh HTTP khác cũng có thể thất bại. Nếu yêu cầu mọi dòng nhật ký phải hiện ngay, cần Duy xác nhận ràng buộc đó và xét lại quy trình/ranh giới, không âm thầm nhận eventual consistency.

**Căn cứ:** [AWS — Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) mô tả bài toán dual write và chống trùng ở bên nhận; đây chỉ là tài liệu pattern, không chọn AWS/SQS/DynamoDB/Saga. [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/) mô tả transaction trên replica set. Phải kiểm chứng transaction trong cấu hình Atlas/Development thực tế; không dùng giao dịch cross-database để vượt quyền sở hữu service.

**Truy vết:** US-014–016/022/023; UC-012–018/026; REQ-014/015/018/019/026. Luồng lỗi này là phần Design được đề xuất, chưa tự sửa Activity Diagram hoặc AC gốc thành đã chấp nhận nhật ký chậm.

## D-003.3 — Nhận job độc quyền có hạn và kết quả không trùng

### Cơ chế đã duyệt

- POI & Content giữ trạng thái công việc ở database của mình. Khi worker lấy việc, thao tác nhận phải nguyên tử để chỉ có một quyền giữ việc hợp lệ cho job tại một thời điểm.
- Quyền giữ việc có hạn (**lease**). Worker đang làm được gia hạn qua API; nếu worker mất kết nối/tắt và lease hết, công việc đang giữ dở có thể được nhận lại theo quy trình, không bị treo vô hạn.
- Kết quả phải gắn đúng job/phiên xử lý và bản nội dung. Chỉ nhận kết quả từ quyền giữ việc còn hợp lệ; gửi lại cùng kết quả không tạo thêm một kết quả nghiệp vụ được chấp nhận. Worker đã mất lease không được ghi đè kết quả mới.
- Lỗi nghiệp vụ/provider hoặc hết quota không tự retry vô hạn: giữ kết quả tốt, trạng thái lỗi/chờ để nhân viên chủ động thử lại qua UC-014 khi có điều kiện. Nhận lại job dở sau khi worker mất không tự tạo yêu cầu xử lý POI mới ngoài lần chạy đã được nhân viên kích hoạt.
- Worker không tự công khai; chỉ Manager công khai bản đủ text/audio đã duyệt cho 16 ngôn ngữ như trước.

**Giới hạn:** Lease giúp quản lý quyền xử lý; không bảo đảm mô hình TTS chỉ chạy vật lý đúng một lần. Worker có thể ngắt ngay sau khi đã tạo audio nhưng trước khi gửi kết quả, nên phải thiết kế tiếp cách nhận kết quả/upload dở. Không tuyên bố exactly-once computation.

**Lợi ích:** Có cách nhận lại việc sau khi máy local ngắt, tránh chấp nhận kết quả trùng hoặc lỗi thời. **Chi phí:** Thêm trạng thái lease/attempt, kiểm tra gia hạn/kết quả và điều kiện nhận lại. Thời lượng lease, polling, gia hạn, số lần nhận lại và tên trường/index cần trình cùng schema/API, chưa chọn số phút/giây ở đây.

**Phương án khác:** Chỉ gán job một lần cho worker đơn giản hơn nhưng cần xử lý thủ công job mắc kẹt sau tắt máy; thêm queue chuyên dụng sẽ tăng hạ tầng/công nghệ chưa được phép. D-003 đề xuất tận dụng MongoDB/API đã chọn, không thêm broker.

**Căn cứ:** [MongoDB atomicity](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/) mô tả tính nguyên tử của cập nhật một document và lọc theo trạng thái mong đợi. Cách lease/gia hạn cụ thể là đề xuất của Vinlook, không phải tính năng quản lý queue được Atlas tự cung cấp.

**Truy vết:** US-011/013/035/036, UC-013/014/032; REQ-011/013/024/029/031/032; worker pull tại DEC-052.

## Phạm vi phê duyệt và các bước tiếp theo

Duy đã duyệt D-003.1/2/3 tại DEC-053, gồm JWT trong bộ nhớ tab/hạn 2 giờ/không refresh và khả năng nhật ký xuất hiện chậm khi có lỗi truyền. Đồng ý pattern không tự duyệt fields, quan hệ, API, tham số hoặc triển khai. Sau đó sẽ trình data model và các quyết định còn mở theo quy trình, bao gồm offline engine, deployment/quota và release design chưa có bằng chứng khả thi.

Hiện chưa cài thư viện ứng dụng, tạo database, credential, job queue, outbox, JWT endpoint hoặc workflow. Nguồn kỹ thuật được kiểm tra 23/10/2026; dùng tài liệu không đồng nghĩa áp dụng toàn bộ khuyến nghị của nhà cung cấp.

Duy duyệt D-003.1/2/3 ngày 23/10/2026, đổi Argon2id sang bcrypt. Đoạn căn cứ Argon2id phía trên là lịch sử đề xuất, không phải thuật toán đã chọn. Các đoạn yêu cầu duyệt phía trên được thay thế bởi DEC-053; fields, API và tham số vẫn chưa duyệt. Bcrypt giới hạn 72 byte đầu vào; cost và chính sách kiểm tra sẽ trình tại D-004.


