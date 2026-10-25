# Vinlook PoC — điều phối hai ngày

Ngày khởi động:26/10/2026 (UTC+7). Cửa sổ mục tiêu26–27/10, xác nhận giờ demo với Duy trước release. Nhánh tích hợp duy nhất `codex/poc-demo`. Duy (`Dihoccode1`) là reviewer và người duy nhất quyết định merge PR/release. Tú `ngoctu0405`, Hạo `2107h06` có quyền write được connector xác nhận lúc giao việc.

## Phạm vi Duy đã chốt

- Toàn bộ A–D trong yêu cầu PoC: khách mobile/laptop, bản đồ/POI/16 ngôn ngữ thật, Admin luồng nội dung, monitor thực, deploy public miễn phí.
- Duy chọn Admin A: login, open/close session, tạo/sửa draft, upload ảnh, Process/jobs, review locale, submit/return/publish. Màn hình quản lý Staff/recovery/delete/restore/audit không là luồng demo bắt buộc, backend quyền/baseline vẫn giữ.
- Duy yêu cầu thêm đầy đủ dẫn đường/offline và15POI. Không hạ xuống một POI hay chỉ nội thành. Offline English theo baseline, không phải offline16ngôn ngữ.
- Mọi POI phục vụ public phải qua cổng16ngôn ngữ/ảnh/entrance/review hiện có. Với15POI public, dữ liệu cần240cặp; hiện chỉ3cặp của POI001 đã được người dùng và hệ thống duyệt. Không dùng cùng audio cho nhiều locale hoặc bỏ cổng publish.
- Không merge PoC vào main, không đóng backlog gốc vì có PoC. Khi Duy gửi chính xác `quy lại tiến độ`, lưu PoC và quay lại mốc gốc; không tự chuyển trước đó.

## Hiện trạng và khoảng cách

Mốc repo gốc main `43a17696bf515cc1f97fc89138e8927f425efdff` (PR69). Identity/Content có code nghiệp vụ và CI; môi trường hosted trước PoC đã chạy, nhưng cấu hình/release phải kiểm tra lại trước thay đổi. Frontend chỉ có preview/i18n. Usage mới health scaffold, chưa telemetry/summary. Chưa có frontend product public.3/240cặp đạt cho yêu cầu PoC mở rộng;15POI đủ source/thumbnail/publish chưa có bằng chứng. Routing research A*/CSR có harness, không phải sản phẩm đã nghiệm thu. Coverage/profile/Safari/navigation/offline-package còn gate.

Thư mục làm việc của lead hiện không có `.git` riêng; Git CLI không xác minh được parent do lỗi `cannot change to C:/Users/Admin`. Không switch/reset/clean/stash thư mục này. Nhánh PoC được tạo qua GitHub từ mốc chính xác, chỉ đưa allowlist tài liệu PoC lên; local scripts/private-results/env/decision log cũ giữ nguyên, không publish toàn bộ. Không tuyên bố working tree sạch. Người nhận dùng clone mới riêng theo START-HERE.

Hai ngày là mục tiêu rủi ro rất cao:13locale còn lại cho POI001,14POI và review đa ngôn ngữ, graph/navigation/offline toàn phạm vi, Usage và UI đều chưa xong. Không có cơ sở hứa hoàn thành chắc chắn. Khó khăn phải báo Duy ngay, không tự giảm phạm vi hoặc gọi phần thiếu là Done. Chỉ Duy được đổi deadline/phạm vi sau khi xem bằng chứng.

## Hai luồng độc lập

| Chủ | Sở hữu | Không tự sửa |
|---|---|---|
| Tú | `services/usage/**`, `scripts/poc/**`, `data/poc/**`, `packages/poc-routing/**`, `docs/poc/tu/**`, `.github/workflows/poc-backend.yml` | `apps/web/**`, baseline docs, root lock/dependency, shared contract |
| Hạo | `apps/web/**`, `tests/poc-web/**`, `docs/poc/hao/**`, `.github/workflows/poc-web.yml` | backend, graph builder/data, baseline docs, root lock/dependency, shared contract |
| Duy | `docs/poc/**` chung, shared contract approvals, root package/lock integration, merged branch, secrets/live changes/release | Không merge thay bằng CI tự động |

Hai người bắt đầu ngay từ cùng seed; dùng adapter/fixture theo hợp đồng để phát triển độc lập. Mock chỉ trong test/local dev, có nhãn; production fail nếu dùng mock, không được làm bằng chứng nghiệm thu. Có dependency tích hợp cuối là tất yếu; không bắt Hạo chờ backend mới dựng UI, không bắt Tú chờ UI mới kiểm thử HTTP/CLI. Khi contract thiếu: cả hai tiếp tục module/test độc lập, Duy chốt contract trước phần ghi/live liên quan. Không hứa hai người hoàn toàn không cần tích hợp.

## Lịch và checkpoint

1. Ngày1 đầu buổi: đọc tài liệu, nhận issue, lập contract/fixture và đề xuất phần thiếu cho Duy. Tú dựng Usage/schema/test + kế hoạch data/graph; Hạo dựng API adapters/routes/telemetry test + UI bằng fixture có nhãn.
2. Ngày1 cuối buổi: PR nhỏ đầu tiên theo từng lane, CI; Duy review và merge từng PR độc lập khi đủ DoD, không đợi bên kia hoàn tất mọi task. Chốt shared contract/dependency root; kiểm tra tiến độ dữ liệu15×16 và quota.
3. Ngày2 đầu buổi: tích hợp thật, xử lý lỗi, tiếp tục dữ liệu/review. Tú chuẩn bị Usage/graph/package/deployment artifact; Hạo gắn live adapters/tourist/Admin/monitor/navigation/offline. Mỗi người tiếp tục PR riêng của mình.
4. Ngày2 cuối buổi: rehearsal cùng thiết bị thật, đo tải/cold start, backup trước thay đổi thật và release nếu toàn checklist đạt. Chưa đủ thì báo `NOT READY` với gap/owner/bằng chứng, xin Duy quyết định; không demo số giả hay publish thiếu.

Xem [truy vết](TRACEABILITY.md), [cách nhận việc với AI](START-HERE.md), [hợp đồng liên nhóm](CONTRACTS.md), [review/merge/nghiệm thu](REVIEW-AND-ACCEPTANCE.md), [Issues được giao](ISSUES.md) và [nhật ký/trạng thái](STATUS.md). Issue GitHub là bảng công việc thực; tracker tổng #81, Tú bắt đầu #70 và Hạo bắt đầu #76.
