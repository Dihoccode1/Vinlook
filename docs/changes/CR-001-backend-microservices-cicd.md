# CR-001 — Backend microservices và CI/CD

Ngày: 23/10/2026. Người yêu cầu/quyết định: Duy. Nguồn: DEC-045.

**Cập nhật DEC-046:** Duy chọn 1A và 2B: microservices/CI-CD phải có ngay Day 5 (26/10/2026); CD tự động sau checks và gate phát hành đã duyệt. Đây là xác nhận phần bổ sung cùng hai điều kiện được hỏi; không phê duyệt kiến trúc chi tiết. Các đoạn phân tích bên dưới giữ bối cảnh đề xuất ban đầu; bảng quyết định cuối tài liệu là trạng thái hiện tại.

**Trạng thái khi lập đề xuất:** Duy đã yêu cầu hướng microservices có CI/CD và đã duyệt US-001–US-034. Phân tích này ghi nhận thay đổi được yêu cầu; phương án thiết kế, AC mới và story bổ sung còn chờ review. Chưa có thiết kế/triển khai ứng dụng để sửa và chưa có pipeline đã chạy.

## Current State

PRD v1.0 được duyệt tại DEC-044; 34 story được duyệt tại DEC-045. Stack có Express.js, MongoDB/Mongoose, JWT/RBAC, Python worker cho MMS, Docker/Compose và GitHub Actions; Vercel frontend, Render backend; mọi dịch vụ miễn phí. Chưa chọn kiến trúc monolith hoặc microservices trước yêu cầu mới này. Không mô tả thay đổi là một migration của hệ thống đang chạy.

Bản chụp: [PRD v1.0](../baselines/PRD-v1.0.md), [User Stories v1.0 đã duyệt](../baselines/user-stories-v1.0.md).

## Problem

Yêu cầu mới xác định hướng kiến trúc backend cần có microservices. Lựa chọn GitHub Actions trước đây chưa đặc tả cách kiểm thử, build và phát hành qua ranh giới nhiều service. Cần thể hiện khả năng vận hành/phát hành theo kiến trúc này, không chỉ đặt tên thư mục là service.

## Proposed Change

- Ghi hướng backend microservices thành REQ-031, bổ sung cách chứng minh ở AC-031 để Duy review. Ranh giới nghiệp vụ, số lượng và quyền sở hữu dữ liệu sẽ được suy ra từ Use Case rồi trình duyệt trong Design.
- Làm rõ CI/CD qua GitHub Actions thành REQ-032/AC-032, gắn với các service được duyệt. Tách việc xác nhận CI (kiểm tra/test/build) và CD (phát hành theo gate) để chốt mức tự động hóa.
- Bổ sung US-035/036 phục vụ góc nhìn người vận hành; giữ nguyên US-001–034 đã duyệt. Không thêm feature du khách thứ bảy.
- Giữ Express.js cho backend và worker Python đã duyệt; không tự thêm Kafka/RabbitMQ, Redis, API Gateway, Kubernetes, service mesh, công cụ registry hoặc dịch vụ có phí. Chỉ đề xuất nếu Design chứng minh cần và Duy duyệt.
- Chưa quyết định monorepo/multirepo, giao tiếp đồng bộ/bất đồng bộ, database/collection theo service, một hay nhiều host, deployment trigger/approval/rollback. MongoDB/Atlas đã chọn không đồng nghĩa phải dùng chung schema hoặc phải tạo nhiều cluster.

## Benefits

Có thể thể hiện trách nhiệm nghiệp vụ riêng và khả năng phát hành từng service; CI/CD cung cấp bằng chứng build/test/phát hành lặp lại được. Đây là lợi ích cần chứng minh trong Design và nghiệm thu, không phải kết quả đã đạt.

## Impact

| Phần | Ảnh hưởng cần xử lý |
|---|---|
| Requirement/Story | REQ-029 được làm rõ; bổ sung REQ-031/032 và AC-031/032; US-035/036 là bản đề xuất mới. Chức năng gốc và chất lượng không tự giảm. |
| Use Case | Chưa có Use Case được tạo. Cần rà các luồng duyệt tài khoản, phiên làm việc, POI, xử lý/công khai nội dung, presence và monitoring trước khi phân rã service. Chưa cấp UC-ID hay tách Use Case mới trong CR. |
| Architecture | Thêm ranh giới service, dependency, cách chịu lỗi và phát hành độc lập; tên/số lượng service chờ Design. Không gán mỗi FEAT thành một service một cách mặc định. |
| Database | Phải chốt service nào chịu trách nhiệm dữ liệu nhân viên/phiên/POI/nội dung/presence; cách giữ nhất quán khi duyệt, xóa/khôi phục và phát hành. Chưa thêm field/entity hoặc quyết định database-per-service. |
| API | Cần hợp đồng giữa frontend/service, giữa các service/worker; xác thực/ủy quyền, lỗi và tương thích phiên bản. Chưa chọn đường dẫn, event hoặc protocol. |
| Testing | Giữ bộ công cụ đã duyệt; cần kiểm tra cả từng service và luồng xuyên service sau khi có API contract. Đặc tả test sau, chưa tạo Test Case/code test tại đây. |
| Monitoring | Phải phản ánh đúng tình trạng nhiều service trong phạm vi backend monitoring; metric mới/tracing stack chưa được phê duyệt. Chu kỳ 30 giây của số khách/người nghe vẫn giữ. |
| CI/CD | Quy trình kiểm tra/build/phát hành cho service theo thiết kế; phải tránh trường hợp kiểm tra thất bại mà vẫn phát hành artifact của revision đó. Trigger, checks cụ thể, artifact/registry/secrets, approval và rollback chờ Duy duyệt. |
| Deployment | Cần chứng minh kiến trúc hoạt động trên tài nguyên miễn phí đã chọn. Docker Compose cho Development không tự chứng minh Production đã triển khai microservices. |
| Team | Thêm việc tích hợp, CI/CD và xử lý lỗi mạng giữa service. Chưa phân công hoặc ước lượng ngày công khi chưa có Design. |

## Risks và căn cứ

Microservices tăng yêu cầu quản lý hợp đồng, test phụ thuộc, tính nhất quán dữ liệu, cấu hình và chẩn đoán lỗi. Gọi qua mạng có thể ảnh hưởng các ngưỡng phản hồi đã chốt; không tự thay ngưỡng hoặc đổi thành yêu cầu luôn-online cho du khách. Tài liệu kiến trúc tham khảo: [Microsoft — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices). Đây là nguồn phân tích, không phải phê duyệt Azure hosting hoặc mọi pattern trong tài liệu.

Render Free hiện cấp **750 giờ instance/workspace/tháng**, được chia cho các Free web service; hết thì các service miễn phí bị đình chỉ đến tháng sau. Chẳng hạn, **giả sử** hai service đều chạy liên tục 25 ngày trong tháng 11, tổng là `2 × 25 × 24 = 1.200 giờ`, vượt 750. Đây chỉ là tính toán minh họa, không chọn hai service hoặc giả định Vinlook phải chạy 24/7. Service idle không tiêu hao giờ nhưng chịu cơ chế ngủ/đánh thức. Render Free không nhận private-network traffic; cần xét tác động bảo mật/kết nối thay vì tự giả định các service gọi nội bộ riêng tư được. Nguồn: [Render Free](https://render.com/docs/free), kiểm tra 23/10/2026.

Hạn mức không tự cho phép mở nhiều tài khoản/workspace để né quota hoặc chuyển sang trả phí. Giữ yêu cầu miễn phí và trình lại phương án nếu không phù hợp. Chuỗi service ngủ có thể làm trải nghiệm đánh thức khác backend đơn; phải đánh giá lại giới hạn cold start đã chấp nhận, không tự tăng thời gian cho phép.

GitHub Actions hỗ trợ workflow gồm job để kiểm tra/build/phát hành; cách cấu hình cho Vinlook chưa có. Nguồn: [GitHub Actions overview](https://docs.github.com/en/actions/about-github-actions/understanding-github-actions). Chưa có workflow/deployment thật hoặc quyền truy cập secrets được thiết lập bởi CR này.

## Affected Timeline

- Giữ Day 1 = 22/10, Day 5 = 26/10, Day 35 = 25/11/2026; tuần sau chỉ tối ưu. Baseline Day 5 vẫn đủ 15 POI, 16 ngôn ngữ và tích hợp thật.
- Thêm thiết kế/phát hành nhiều service làm tăng rủi ro của Day 5 vốn đã chưa được chứng minh khả thi. Không thể đưa số ngày phát sinh đáng tin cậy khi chưa có service boundaries và cách deploy; chưa lập kế hoạch mới hoặc cam kết không ảnh hưởng lịch.
- **Cần Duy xác định checkpoint phải chứng minh REQ-031/032:** ngay Day 5 hay có thể hoàn thiện dần nhưng phải đủ trước Day 35. Không mặc nhiên dời yêu cầu mới sang sau Day 5.

## Decisions Pending

1. Checkpoint nghiệm thu microservices/CI-CD: Day 5 hoặc hoàn thiện dần đến Day 35, với phạm vi ở từng checkpoint phải trình rõ.
2. CD khi đủ gate phát hành: CI chạy tự động, CD chờ Duy chấp thuận từng lần; hay tự triển khai sau khi checks/điều kiện release đã duyệt đạt? Cả hai đều phải giữ gate Waterfall và không dùng CI/CD để bỏ qua phê duyệt phase.
3. Ranh giới/số service, data ownership, giao tiếp, repository và topology host: giải quyết trong Design sau Use Case; chưa cần lựa chọn tại bước cập nhật yêu cầu này.

## Điều kiện xét duyệt phần bổ sung

Duy review REQ-031/032, AC-031/032 và US-035/036, đồng thời trả lời hai điểm đầu trên. Các mục kiến trúc chi tiết vẫn phải trình tại Design. Không xin duyệt lại US-001–034 đã được xác nhận. CR không tự phê duyệt AC chi tiết hoặc coi bản cập nhật PRD/User Story là đã duyệt toàn bộ.

## Kết quả quyết định — DEC-046

| Điểm hỏi | Kết quả |
|---|---|
| Checkpoint | Day 5, 26/10/2026; không lùi microservices/CI-CD tới Day 35. |
| CD | Tự động sau checks/gate phát hành đã duyệt; không thêm bước duyệt tay từng deploy. |
| Phân rã service và cấu hình | Chưa chọn; trình sau Use Case trong Design. |

Giữ nguyên toàn bộ rủi ro đã nêu; chưa có bằng chứng feasibility, workflow run hoặc deployment.
