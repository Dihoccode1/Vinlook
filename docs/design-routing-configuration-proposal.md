# Vinlook — D-011: lựa chọn engine và cấu hình dẫn đường

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-071**. Tiếp tục Design; chưa mở gate Implementation. Truy vết: REQ-004–009/027, UC-006/008, DEC-060–070.

## 1. Đề xuất chốt lựa chọn công nghệ

Chọn **engine JavaScript A* trên graph đi bộ OSM tiền xử lý, chạy trong Web Worker** làm baseline thiết kế Vinlook, dùng chung logic online/offline. Node identity xác định kết nối; không nối cầu/hầm vì giao hình học. Graph nhị phân CSR thử nghiệm là cơ sở để hoàn thiện, không đóng băng format hoặc dùng nguyên candidate thiếu kiểm chứng làm bản phát hành.

Chốt lựa chọn công nghệ **không đồng nghĩa nghiệm thu tính đúng tuyến hoặc đạt toàn bộ AC**. Bằng chứng hiện có: 31 truy vấn A* khớp Dijkstra; Chrome desktop online/offline; iPhone Chrome p95 245 ms tại lần ghi file, offline hoàn tất theo xác nhận Duy. Android được Duy miễn kiểm thử tại DEC-070. Chưa có Safari riêng, dữ liệu tuyến thực địa, điểm vào POI hoặc live GPS/reroute đạt nghiệm thu.

Đề xuất cho phép tiếp tục thiết kế theo baseline này và đưa các khoảng trống vào Test Plan/release gates bắt buộc; không để phần lựa chọn engine đứng chờ toàn bộ nghiệm thu sản phẩm. Nếu sau kiểm chứng không đáp ứng, trình thay đổi công nghệ/ảnh hưởng, không tự giảm coverage hoặc thay bằng đường thẳng.

## 2. Tham số sản phẩm đề xuất

Các con số dưới đây **mới là đề xuất**, không suy từ các ngưỡng fixture nghiên cứu.

| Chính sách | Đề xuất | Hành vi khi không đạt |
|---|---|---|
| GPS accuracy | Chấp nhận accuracy ≤50 m để tính/tính lại | Vẫn hiển thị vị trí gần nhất và trạng thái GPS chưa chính xác; không tính lại do một fix kém |
| Snap tối đa | 50 m tới cạnh đi bộ hợp lệ | Báo không tìm được đường đi bộ gần vị trí, cho Retry; không kéo tới đường xa tùy ý |
| Lệch tuyến | Cách polyline >30 m ở 3 fix hợp lệ liên tiếp | Tính lại đến cùng POI; reset bộ đếm nếu trở lại tuyến hoặc GPS mất/kém |
| Khoảng cách giữa hai lần reroute | Tối thiểu 10 giây, chỉ một tác vụ hiện hành | Hủy/bỏ kết quả cũ theo request ID; dùng vị trí hợp lệ mới nhất sau khi đủ điều kiện |
| Tới nơi | Cách điểm vào POI ≤25 m với accuracy ≤25 m | Kết thúc chỉ dẫn và hiển thị Arrived; không tự phát audio |
| Mất GPS | Giữ tuyến/đích/vị trí cuối, ghi unavailable | Khôi phục fix hợp lệ rồi tiếp tục đánh giá; không báo đang di chuyển từ tọa độ cũ |

Snap không chỉ tìm cạnh gần nhất: phải xét chiều đi bộ, khả năng nối tới đích và dữ liệu lối vào. Không tự coi đoạn thẳng nối GPS lên cạnh là đường được phép đi. Khi connector không xác minh được, hiển thị vị trí thực và yêu cầu người dùng tiếp cận đường có thể định vị, thay vì dẫn xuyên tường/sông. Không hứa GPS phân biệt tầng cầu/hầm.

Các ngưỡng là khởi điểm để đo và điều chỉnh có kiểm soát; phải ghi cấu hình/version cùng kết quả test. GPS kém không được làm hệ thống báo Arrived sớm hoặc tính lại liên tục.

## 3. Profile và chỉ dẫn cần hoàn thiện trước release

- Quyền foot cụ thể được ưu tiên so với access chung theo bảng profile phải soạn; không chỉ dựa vào highway class. Conditional access, barrier, restrictions/relations và dữ liệu nguồn thiếu phải được giải quyết hoặc thể hiện rõ không xác định, không mặc định cho phép đi.
- Importer hiện không chứa đầy đủ relations và có quy tắc bảo thủ gây mất kết nối; phải rà nguồn đầy đủ, giữ provenance và test các trường hợp trước khi phân phối graph cuối.
- Chỉ dẫn phải dựa vào tuyến và nút giao, có tên đường nếu nguồn có, khoảng cách, thao tác rẽ/đi tiếp và điểm vào. Hàm phân góc 30 độ trong harness chỉ là fixture nghiên cứu, chưa phải chỉ dẫn hoàn chỉnh.
- Thêm spatial index và giới hạn bộ nhớ cho snap, tránh quét toàn graph trong mỗi GPS update; không coi bộ test hình học 9/9 là hiệu năng sản phẩm đã đạt.
- Test route/recalc ≤5 giây theo PRD phải đo toàn luồng, gồm snap và tạo chỉ dẫn; các số A* lõi không thay thế phép đo này.

## 4. Quyết định cần Duy

1. **Chốt engine A làm baseline công nghệ để tiếp tục Design**, với các gate nghiệm thu/release còn mở ở trên; không ghi engine đã đạt mọi yêu cầu.
2. Duyệt các ngưỡng GPS/snap/reroute/arrival ở mục 2, hoặc chỉnh con số cụ thể.
3. Đề xuất **giữ Safari là target kiểm thử trước release**, nhưng cho tiếp tục Design hiện tại dựa trên iPhone Chrome đã có kết quả; không tự miễn Safari vì đã miễn Android.

Sau D-011: hoàn thiện API request/response và sequence cho các luồng quan trọng, UI wireframes, chính sách nội dung/upload/backup và Test Plan; tổng hợp checklist Design để Duy duyệt toàn phase trước khi tạo code sản phẩm. Không tự giao người hoặc tạo workflow/release ngoài harness đã được phép.

## Phê duyệt — DEC-071

Duy duyệt toàn bộ D-011: baseline engine A*, các tham số GPS/snap/reroute/arrival và tiếp tục Design, giữ Safari trong kiểm thử trước release. Đây là chốt lựa chọn thiết kế; không xác nhận toàn bộ AC điều hướng đã đạt, không mở gate Implementation.
