# Vinlook — D-010: hướng engine dẫn đường offline

Ngày 23/10/2026. **ĐÃ CHỌN HƯỚNG A tại DEC-060; kiểm chứng và cấu hình engine chưa chốt**. D-009 đã duyệt tại DEC-059. Dữ liệu đường thô 12,74 MB chưa phải graph routing. Chưa có số đo thời gian tính tuyến/RAM trên điện thoại.

## 1. Các phương án

| Hướng | Lợi ích | Phần còn phải làm/rủi ro |
|---|---|---|
| A — Đề xuất: graph đi bộ tiền xử lý từ OSM, engine JavaScript A* trong Web Worker | Kiểm soát dữ liệu, dùng cùng logic online/offline trên trình duyệt, không thêm dịch vụ routing/chi phí mỗi request | Nhóm phải xây dựng và kiểm chứng importer/profile đi bộ, graph, tìm đường, snap vị trí và sinh chỉ dẫn; thuật toán A* đơn thuần không giải quyết các phần này; chưa chứng minh RAM/tốc độ cho toàn phạm vi |
| B — Thử thư viện geojson-path-finder trong Web Worker | Có thư viện tìm đường sẵn, chạy client; giảm phần thuật toán lõi tự viết | Tài liệu định hướng mạng nhỏ; dữ liệu GeoJSON lớn có thể tốn RAM; vẫn phải chuẩn bị mạng đi bộ, snap, xử lý barrier và chỉ dẫn; chưa chứng minh phù hợp toàn HCMC |
| C — Tiếp tục đánh giá engine chuyên dụng/port browser | Có thể tái sử dụng profile và logic navigation phong phú hơn | BRouter gốc là Java/Android; GraphHopper API/JS client không tự đồng nghĩa engine chạy offline trong Safari. Port/WASM cần xác minh build, giấy phép, profile, kích thước, RAM và iOS; chưa có bản phù hợp đã kiểm chứng |

Khuyến nghị A là nhận định thiết kế của Vinlook dựa trên khả năng kiểm soát footprint và không thêm runtime hosted, **không khẳng định A ít công hoặc đã khả thi hơn mọi thư viện**. Rủi ro tự xây engine đáng kể với nhóm và thời hạn hiện tại. Nếu chọn A nhưng kiểm chứng không đạt, phải trình kết quả/đổi hướng; không giảm phạm vi xuống một quận hoặc chỉ vài tuyến cài sẵn.

Nguồn chính: [geojson-path-finder](https://github.com/perliedman/geojson-path-finder) mô tả tìm đường trên mạng LineString và hỗ trợ trọng số; [BRouter](https://github.com/abrensch/brouter) mô tả Java/Android và HTTP server; [GraphHopper](https://github.com/graphhopper/graphhopper/blob/master/README.md) phân biệt routing engine và API/client. Đây là đối chiếu tài liệu, không phải benchmark.

## 2. Phạm vi kỹ thuật đề xuất nếu chọn A

- Build graph trên máy tính từ OSM có version/nguồn/license: node theo OSM identity, cạnh có chiều/quyền đi bộ/độ dài/tên đường và metadata cho chỉ dẫn. Không nối hai đường chỉ vì chúng giao nhau trên mặt phẳng; giữ khác biệt cầu/hầm/tầng và các node thật sự nối nhau.
- Profile đi bộ phải xử lý `foot`, `access`, barrier, pedestrian/steps và hạn chế liên quan; cần bảng quy tắc chi tiết để duyệt, không chỉ lọc mọi `highway` thành đường hợp lệ. Không tự chọn tuyến qua đường cấm hoặc kết nối bằng đường thẳng qua sông.
- Graph dạng nhị phân/chunk, chỉ mục tìm cạnh gần vị trí, chạy A* trong Worker. Heuristic khoảng cách địa lý chỉ dùng khi được chứng minh không lớn hơn chi phí còn lại theo profile; không tuyên bố mọi cấu hình trọng số đều bảo toàn tối ưu.
- Snap vị trí/điểm đến lên cạnh đi bộ hợp lệ, giữ đoạn nối hiển thị rõ; điểm vào POI cần kiểm chứng thực tế, không dùng tâm tòa nhà bất kỳ. Ngưỡng snap và lệch tuyến chưa chọn.
- Sinh chỉ dẫn chữ/hình từ chuỗi cạnh và nút giao, không chỉ vẽ polyline. Theo dõi GPS foreground, xác định lệch tuyến và tính lại từ vị trí mới. Giữ các hành vi mất GPS/không có tuyến đã duyệt.
- Cùng engine chạy trong trình duyệt cả online/offline sau khi graph sẵn sàng; lần online chưa tải gói vẫn cần tải graph cần thiết để tính tuyến, không bắt du khách phải tải audio toàn bộ trước khi chỉ đường. Cơ chế tải graph online/chunk cần thiết kế tiếp, không mặc định bắt buộc gói offline đầy đủ.
- Không giới hạn tuyến trong bán kính 3 km: 3 km chỉ là quy tắc gợi ý POI. Không hứa có tuyến đi bộ nối đảo với đất liền.

## 3. Kế hoạch kiểm chứng đề xuất — chưa thực hiện

Chỉ sau khi Duy cho phép làm nghiên cứu khả thi, tạo harness tách biệt dưới docs/research, không tạo ứng dụng sản phẩm/schema/workflow hoặc deploy. Không coi cho phép nghiên cứu là mở gate Implementation.

1. Dựng graph thử nhỏ có bộ trường hợp chuẩn: đường cấm đi bộ, barrier, cầu/hầm giao không nối, một chiều áp dụng cho foot, mạng rời và điểm không snap được. Đối chiếu đường đi/khoảng cách với Dijkstra trên cùng graph; đây chỉ kiểm tra thuật toán, không chứng minh profile thực tế đúng.
2. Biên dịch phạm vi HCMC đã chốt, đo graph nén/tải/giải nén/RAM, thời gian khởi tạo; giữ Côn Đảo và vùng sáp nhập, không đổi coverage để có số đẹp.
3. Đo ít nhất 30 cặp điểm có phân bố trung tâm/ngoại vi/vùng sáp nhập, tuyến ngắn/dài và mạng rời; ghi tập dữ liệu và kết quả từng case. Kiểm tra thủ công tuyến mẫu/điểm vào POI từ nguồn phù hợp. Không lấy 3 km làm cự ly tối đa.
4. Trên Galaxy A35 Chrome và iPhone 13 Safari: tắt mạng, tính/tính lại, kiểm tra 95% thao tác đo ≤5 giây theo yêu cầu; ghi riêng cold load và RAM/crash. Nếu chưa có thiết bị, báo chưa kiểm chứng, không thay bằng desktop rồi tuyên bố đạt.
5. Thử tích hợp dữ liệu cục bộ và reopen offline với harness; package đầy đủ/audio/app vẫn phải kiểm thử sau Implementation. Ghi thiếu sót, không đổi test thành chứng nhận end-to-end sản phẩm.

Không đặt số MB/RAM đạt trước khi có dữ liệu thật. Các kết quả không đạt phải báo để Duy quyết định hướng khác và tác động thời gian. Day 5/35 không thay đổi bởi tài liệu này.

## 4. Hai quyết định cần Duy

1. Chọn hướng **A**, **B**, hoặc **C** để tiếp tục; lựa chọn hiện tại là hướng đánh giá, không phải chốt một engine đã đạt kiểm chứng.
2. Có cho phép chạy **nghiên cứu khả thi tách biệt** ở mục 3 trong Design không? Nếu không, chỉ tiếp tục tài liệu và ghi rõ chưa có bằng chứng feasibility trước gate Design; không âm thầm code ứng dụng.

Các ngưỡng snap/reroute, profile, định dạng graph và contract vẫn phải trình sau kết quả. D-010 không mở Implementation hoặc tự giao người trong nhóm.

## Kết quả lựa chọn — DEC-060

Duy trả lời A: chọn graph đi bộ tiền xử lý từ OSM và JavaScript A* trong Web Worker làm hướng tiếp tục đánh giá. Câu hỏi cho phép chạy harness nghiên cứu chưa được trả lời; không suy diễn lựa chọn A là đã cho phép chạy code nghiên cứu hoặc mở Implementation. Kế hoạch kiểm chứng được cụ thể hóa tại research/offline-routing-verification-plan.md.
