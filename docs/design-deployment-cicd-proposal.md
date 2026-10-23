# Vinlook — D-008: topology và CI/CD

Ngày 23/10/2026. **ĐÃ DUYỆT — phương án A, DEC-058**. Cơ sở DEC-046/051–057. Chưa tạo workflow, branch, tài khoản hosting, deployment hay secret.

## 1. Topology đề xuất

| Thành phần | Development | Production |
|---|---|---|
| React frontend | Máy nhóm | Một project Vercel Hobby |
| Identity, POI, Monitoring | Ba container Express riêng qua Compose | Ba Render Free web services riêng, mỗi service một Docker build |
| Database | MongoDB replica set local phục vụ transaction, ba logical DB | Một Atlas Free cluster, ba logical DB/service accounts theo D-002 |
| Python MMS worker | Máy local 16 GB RAM | Vẫn chạy chủ động trên máy nhóm, gọi HTTPS POI service; không deploy lên Render |
| Ảnh/audio | Asset thử nghiệm tách namespace | Cloudinary Free, không ghi vào filesystem Render để giữ bền vững |

Frontend gọi URL riêng của từng service; service nội bộ gọi REST/HTTPS URL công khai có credential. Không thêm gateway/private network giả định, Redis hoặc broker. PMTiles/graph/gói offline chưa chọn hosting; không mặc định Cloudinary chứa mọi loại file hoặc quota đủ.

### Quyết định vận hành cần chọn

**Đề xuất A — Dev local, Prod dùng cho kiểm thử/demo theo nhu cầu**, không hứa 24/7. Ba service giữ nguyên ranh giới và deploy độc lập; không giả là ba thư mục trong một process. Ngừng worker polling và đóng dashboard khi không làm việc; không ping giữ thức. Khi gần hết ngân sách, nhóm chủ động dừng hoạt động thử nghiệm và thông báo, không bật trả phí hoặc mở tài khoản né quota.

Ví dụ ngân sách quy hoạch **không phải số đo**: cả ba service thức 6 giờ/ngày trong 30 ngày = 540 service-hours; còn 210 giờ cho cold-start/tail idle/build-related runtime và truy cập ngoài lịch. Lịch 6 giờ không được coi là cưỡng chế giới hạn: truy cập thực có thể đánh thức service và khiến tổng vượt dự toán. 50 khách đồng thời không nói lên tổng số giờ/tháng. Cần kiểm tra usage thực tế và lịch demo trước release; không bảo đảm phù hợp 750 giờ chỉ bằng phép tính này.

**Phương án B — Cần online liên tục hoặc không chấp nhận ngân sách theo nhu cầu:** giữ thiết kế microservices nhưng phải xem lại nơi hosting hoặc yêu cầu vận hành qua đề xuất thay đổi. Chưa có nhà cung cấp thay thế miễn phí được xác minh đáp ứng toàn bộ; không tự chuyển stack.

Render cấp **750 giờ/workspace/tháng**, cộng dồn các Free services và sleep sau 15 phút không có inbound traffic. Ba service thức suốt 30 ngày cần 2.160 giờ. Đây là giới hạn thực của phương án, không khắc phục bằng CI/CD. [Render Free](https://render.com/docs/free).

## 2. Monorepo và release đề xuất

```text
apps/web/
services/identity/
services/poi-content/
services/usage-monitoring/
workers/mms/
contracts/
infra/compose/
docs/
.github/workflows/
```

Đề xuất npm workspaces cho phần JavaScript, Python requirements riêng; mỗi service sở hữu Dockerfile, tests, cấu hình và quyền database của nó. Tài liệu contracts không chứa shared Mongoose model xuyên service. `contracts/` chứa hợp đồng API; thay đổi contract phải kiểm tra consumer liên quan.

Đề xuất branch chính `main`; nhánh công việc theo `codex/…` khi do agent tạo, nhóm có thể dùng quy ước riêng được thống nhất. PR vào main chạy CI; không tự giao người hoặc chọn reviewer. Sau gate Requirement/Design và các điều kiện release được duyệt, merge main kích hoạt **CD tự động** theo DEC-046, không yêu cầu thêm một lần bấm duyệt từng deployment.

## 3. Pipeline đề xuất

1. PR: cài dependencies bằng lockfile, lint, test nghiệp vụ phù hợp, frontend build và build Docker image các service bị ảnh hưởng; worker thay đổi thì kiểm tra Python riêng. Thay đổi contract/shared dependency chạy kiểm tra toàn bộ consumer liên quan.
2. Kiểm tra tích hợp trên Mongo replica set dùng một lần trong CI; không dùng Production DB hoặc secret Production cho PR. Kiểm tra health/contract và các luồng thay đổi có ảnh hưởng. Vitest/Supertest/Playwright theo lựa chọn đã ghi; cấu hình chi tiết trình cùng Test Plan.
3. Main sau checks đạt: xác định commit SHA, chỉ triển khai thành phần bị ảnh hưởng; serialize release để hai lần deploy không đè nhau. Tắt đường auto-deploy hosting bỏ qua CI; dùng cơ chế deploy qua API/hook được kiểm chứng và secret chỉ trong workflow tin cậy.
4. Release backend trước khi frontend cần contract mới; API thay đổi phải tương thích cả phiên bản đang chạy trong lúc rollout. Không tuyên bố ba service cập nhật nguyên tử. Breaking change phải có kế hoạch chuyển đổi riêng.
5. Chờ trạng thái deploy thành công và kiểm tra smoke/health thực; phản hồi HTTP từ deploy hook chưa đủ coi là release thành công. Cold start đo riêng với ngưỡng hiệu năng khi đã thức.
6. Thất bại: dừng thành phần phụ thuộc chưa triển khai, giữ/báo trạng thái từng thành phần; redeploy commit đã biết tốt theo runbook. Không tự restore database khi rollback code. Migration có phá dữ liệu phải được duyệt riêng và backup trước.

Worker local không thể tự cập nhật qua Render CD. Đề xuất CI tạo bản đóng gói worker gắn commit SHA; nhóm cập nhật worker local bằng runbook và kiểm tra contract version trước nhận job. **Điểm cần chấp nhận:** CD tự động áp dụng cho các thành phần hosted; việc thay phiên bản worker trên máy cá nhân là bước vận hành thủ công, không âm thầm coi đã tự deploy worker.

## 4. Free tier, secret và bằng chứng còn thiếu

- Vercel Hobby có ràng buộc quyền repo/commit author; cần kiểm tra repo/account thực trước khi chốt integration, không đổi tác giả commit để vượt điều kiện. [Vercel Git](https://vercel.com/docs/git).
- Render deploy API/hook, Vercel token/CLI, Actions permissions và giới hạn CI thực tế phải xác minh trong bước cấu hình; bản đề xuất chưa khẳng định đã có credentials hoặc đã chạy được.
- Không thêm staging dài hạn ngoài Dev/Prod đã chọn. Môi trường CI tạm thời không phải Production thứ hai. Không dùng tài khoản có billing tự nâng gói.
- Health polling chỉ khi dashboard hoặc release đang hoạt động; không bật cron 24/7 giữ ba Render service thức.
- Hệ thống chưa được chứng minh đủ RAM, quota, 50 khách, routing offline hoặc 16 ngôn ngữ. Day 5/Day 35 giữ nguyên; rủi ro phải được giải quyết bằng kiểm chứng, không coi phê duyệt tài liệu là test đạt.

## 5. Nội dung cần Duy quyết định

1. Chọn **A** (Dev local/Prod theo nhu cầu với ngân sách được theo dõi) hoặc **B** (cần xem lại hosting vì yêu cầu online liên tục).
2. Duyệt topology, cấu trúc repo/npm workspaces và pipeline đề xuất, hoặc chỉ rõ điều muốn sửa.
3. Chấp nhận CD tự động cho hosted components, còn cập nhật worker local thủ công bằng bản đóng gói đã qua CI; hoặc yêu cầu thiết kế thêm tự động cập nhật worker trước khi chốt release scope.

Tài liệu này chỉ đề xuất thiết kế. Không mở repo/PR/workflow hay triển khai bên ngoài trong bước này. Duyệt D-008 chưa hoàn tất Design tổng thể.

## Kết quả phê duyệt — DEC-058

Duy chọn 1-A và duyệt toàn bộ phần còn lại: Dev local/Production theo nhu cầu với ngân sách theo dõi, topology ba Render services, monorepo/npm workspaces, pipeline và CD hosted components tự động. Worker local cập nhật thủ công bằng bản đã qua CI. Không ngầm thêm yêu cầu online 24/7, không xác nhận quota/hiệu năng đã được kiểm chứng hoặc workflow đã tạo.
