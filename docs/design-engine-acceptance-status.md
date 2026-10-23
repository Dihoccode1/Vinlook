# Vinlook — trạng thái chốt engine A

Ngày 23/10/2026. Tiếp tục theo yêu cầu Duy. Hướng A đã chọn, nghiên cứu đã được phép. **Chưa chốt engine đạt yêu cầu sản phẩm.**

## Bằng chứng hiện có

Graph thử nghiệm và 31 truy vấn Node.js: xem research/routing-spike/README.md. Kết quả chỉ xác nhận tìm đường trên candidate graph, không chứng nhận profile hay dẫn đường trên điện thoại.

Đã mở HTTP server chỉ bind 127.0.0.1:8765 phục vụ harness. Công cụ in-app browser thử truy cập nhưng trả net::ERR_CONNECTION_TIMED_OUT. Không có kết quả benchmark browser từ lần thử này; không gọi timeout đó là lỗi thuật toán routing. Không mở tunnel/public hosting để vượt giới hạn môi trường.

## Các gate để chốt

| Gate | Trạng thái |
|---|---|
| A* đối chiếu Dijkstra trên candidate | Đạt 31 cặp đã đo, phạm vi hẹp |
| Profile access/foot/barrier/conditional và fixture importer | Chưa đạt kiểm chứng |
| Điểm vào POI, snap, instruction, reroute | Chưa triển khai trong harness |
| 30 cặp thực tế phân tầng địa bàn | Chưa có; 30 cặp node tự chọn không thay thế |
| Chrome Android và Safari iPhone, p95 ≤5 giây | Chưa đo |
| Tải/lưu/mở lại graph offline và package | Chưa đo browser |

Không thể chốt engine chỉ bằng duyệt văn bản. Có thể tiếp tục hoàn thiện harness trong phạm vi DEC-061, nhưng kiểm chứng điện thoại cần thiết bị thực. Không giảm requirement hoặc mở Implementation từ tài liệu này.

## Thiết bị thực tế — DEC-062

Duy có iPhone 11 Pro Max. Dùng máy này cho lượt kiểm chứng iOS tiếp theo, ghi phiên bản iOS/Safari thực tế; không ghi kết quả thành iPhone 13. Chưa có thiết bị Android được xác nhận và chưa chạy phép thử trên điện thoại. Harness hiện chỉ phục vụ graph-node benchmark, không có GPS/instructions hoặc kiểm chứng toàn bộ offline; cần hoàn thiện trước khi kiểm thử chốt engine.

## Thiết bị thực tế đã xác định

DEC-062: iPhone 11 Pro Max/Safari và Samsung Galaxy Note20 Ultra/Chrome. Chưa có OS/browser version hoặc số đo. Môi trường local bị chặn socket khi kiểm tra HTTP và in-app browser timeout; không có benchmark browser trong lần thử. Server tạm đã dừng.

DEC-063: Duy cung cấp iOS 26.5 cho iPhone 11 Pro Max, Android 17 cho Galaxy Note20 Ultra. Đây là cấu hình do người dùng báo, chưa xác minh trực tiếp; browser version và kết quả thử vẫn chưa có.

## Cập nhật đợt 3

Đã sửa lỗi access tại node, importer fixtures 11/11; snap/direction/connectivity fixtures 9/9. A* trên graph rebuilt khớp Dijkstra 31/31, p95 Node 193,12 ms. Snap hiện là prototype quét tuyến tính, connector chưa xác minh khả năng đi bộ. Các gate chỉ dẫn/reroute, route thực địa phân tầng, browser/mobile và offline reopen vẫn chưa đạt. Không đổi trạng thái engine thành chấp nhận sản phẩm.

## Đợt 4

Browser Chrome desktop đã đo thành công, kể cả đóng/mở tab với localhost server dừng (31/31, p95 offline 199,1 ms). Gate browser desktop có bằng chứng hẹp; mobile chưa đo. Gói thử điện thoại đã chuẩn bị; cần URL HTTPS và kết quả user chạy trước khi đánh giá mobile. Gate correctness thực địa/profile đầy đủ và navigation vẫn mở, không chốt engine bằng benchmark tốc độ.

DEC-066: Duy báo harness chạy tốt. Chưa có xác nhận cụ thể từng thiết bị/chế độ hoặc JSON; ghi nhận phản hồi định tính, không tự đánh dấu cả bốn trường hợp hay engine sản phẩm đạt.

DEC-067: Duy xác nhận chạy tốt cả hai OS. JSON gửi kèm ghi Windows Chrome 155: 31/31 khớp, p95 189,9 ms, không lỗi path. Không có trường mode và deviceNotes vẫn là placeholder; file không chứng minh số đo iOS/Android. Giữ kết quả mobile ở mức user-reported, không phủ nhận phản hồi của Duy hoặc gán sai thiết bị cho file.

DEC-068: JSON mới là iPhone iOS 26.5.0 / Chrome iOS (CriOS 155), 31/31 khớp, p95 245 ms, không lỗi graph path. Có bằng chứng chạy lõi trên iPhone Chrome, chưa thay Safari. Duy báo Prepare chạy sau đóng/mở và đổi kết nối; cần xác nhận Run khi cả Wi-Fi/mobile data tắt vì file không ghi network mode.

DEC-069: Duy xác nhận nhận đủ 31 kết quả Run sau đóng/mở tab với chế độ máy bay, Wi-Fi/mobile data tắt, trong ngữ cảnh iPhone đang kiểm thử. Ghi offline execution user-confirmed; không gán số p95 245 ms của JSON trước thành số đo offline nếu chưa có file tương ứng. Android/Safari và correctness/navigation ngoài graph vẫn chưa đủ bằng chứng.

## DEC-070 — miễn kiểm thử Android

Duy quyết định bỏ qua kiểm thử Android và chấp nhận điều kiện này để tiếp tục review engine. Trạng thái: **waived by Duy — không có bằng chứng đã chạy**. Không tiếp tục yêu cầu JSON Samsung như điều kiện chặn. Yêu cầu sản phẩm hỗ trợ Android giữ nguyên; hiệu năng/offline Note20 Ultra chưa đo. Các gate Safari, correctness và GPS/navigation không được miễn bởi quyết định này.

## Đề xuất chuyển tiếp Design

D-011 trình việc chốt A thành baseline công nghệ có điều kiện nghiệm thu riêng, cùng tham số GPS/snap/reroute/arrival. Chưa được duyệt; không ghi engine đủ điều kiện release hoặc Implementation được mở. Android waived giữ nguyên DEC-070.

## Trạng thái hiện tại — DEC-071

**Đã chốt baseline công nghệ engine**, Duy duyệt toàn bộ D-011. Các đoạn chưa chốt phía trên là lịch sử kiểm chứng. Nghiệm thu routing sản phẩm vẫn mở: correctness/profile đầy đủ, snap/instructions/reroute thực tế, Safari, hiệu năng toàn luồng và package đầy đủ. Không tiếp tục yêu cầu chọn engine lại trừ khi có bằng chứng cần đổi thiết kế.
