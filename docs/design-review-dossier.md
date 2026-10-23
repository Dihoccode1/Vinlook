# Vinlook — D-021: hồ sơ review tổng thể Design

Ngày 23/10/2026. **ĐÃ DUYỆT, GATE DESIGN ĐÃ ĐÓNG tại DEC-081.** D-001–020 đã duyệt theo Decision Log; D-020 chọn JavaScript. Hồ sơ này tổng hợp quyết định, nêu rõ phần bổ sung cần duyệt và điều kiện chuyển bước.

## 1. Bộ deliverables

| Nhóm | Tài liệu chuẩn để review |
|---|---|
| Architecture | design-options.md, design-data-communication-proposal.md |
| Security/consistency | design-security-consistency-proposal.md, design-security-worker-parameters-proposal.md |
| Data | design-data-model-proposal.md, design-schema-detail-proposal.md, **design-data-catalog.md** hợp nhất |
| API | design-api-proposal.md, design-navigation-contract-proposal.md, design-content-pipeline-contract-proposal.md, design-remaining-api-contracts-proposal.md |
| Offline/routing | design-offline-package-proposal.md, design-offline-routing-options.md, design-routing-configuration-proposal.md |
| UI | design-ui-wireframes-proposal.md, UI baseline trong design-final-tooling-proposal.md |
| Integration/tooling | design-language-integration-proposal.md, design-final-tooling-proposal.md |
| Ops/CI/CD | design-deployment-cicd-proposal.md, design-recovery-backup-proposal.md |
| Diagrams | design-diagram-review.md, diagrams/design/index.html, manifest.json; PlantUML sources và SVG/PNG |
| QA/trace | test-plan-proposal.md, test-cases.md, traceability-matrix.md |
| Evidence | research/routing-spike/README.md và evidence/; Decision Log DEC-061–070 |

File chứa nhiều lớp lịch sử phải đọc cùng DEC mới nhất. Ví dụ Argon2id đã được thay bằng bcrypt; chọn hướng A đã thành baseline engine tại DEC-071; câu hỏi cũ về model điện thoại không còn mở sau DEC-062/063; Android là waived theo DEC-070. Không diễn giải một dòng “chưa chọn” lịch sử thành quyết định đang mở nếu đã có DEC thay thế.

## 2. Baseline để lập task

- Mobile-first React19/Tailwind4/shadcn SPA, JavaScript ESM/JSX/JSDoc, Vite; 3 Express services/DB ownership riêng trên một Atlas cluster; local Python MMS worker.
- Public guest flows không login; Staff/Manager JWT2h memory-only, bcrypt12, current account/session checks. Provider adapters B; upload signed; versioned drafts/media và Manager publish đủ16.
- Offline English đầy đủ theo PRD; A*/graph OSM/Worker, ngưỡng D-011; multi-version package, snapshot trong navigation, synced deletion ưu tiên dừng.
- Production theo nhu cầu trên free tiers, không cam kết24/7; CD hosted components tự động sau gates; worker local update qua runbook.
- 7z AES-256 backup, Duy giữ khóa; runbook writer stop/restore trial; thực hiện Production restore phải xác nhận target/snapshot riêng.

Không làm thay đổi 15POI,16ngôn ngữ, deadline hoặc định nghĩa executable MVP. Không tự phân công thành viên, tạo Issue, PR hoặc merge từ việc tổng hợp hồ sơ.

## 3. Bổ sung nhỏ cần Duy duyệt trước schema

1. **ProcessingJob.reclaimCount** để thực thi cap ba lần reclaim đã duyệt; quy tắc tăng/reset ghi tại data catalog.
2. **audioAsset.textVersion/registryVersion/voiceOrModelId** để kiểm tra đúng input và cấu hình giọng khi publish.

Không bổ sung scope nghiệp vụ hoặc service mới. Chi phí là thêm validation/atomic update/index review và fixtures; áp vào UC-013/014/016, TC-040/041/045/049/051. Nếu Duy không duyệt cấu trúc này, phải chọn cách lưu tương đương trước khi task schema READY.

## 4. Các kiểm chứng còn chờ và cách không làm sai gate

| Mục | Trạng thái | Điều kiện trước task sử dụng / trước release |
|---|---|---|
| Gemini model ID/quota | Chưa xác minh project thật | Task tích hợp chỉ gọi khi model stable Free tier được xác nhận và cấu hình ghim; không auto paid |
| Azure region/voice/F0/MMS throughput | Registry ứng viên, chưa tích hợp | Task sample kiểm chứng, đủ16 đúng locale/chất lượng trước publish |
| Route correctness/profile/entrance | Candidate research, còn thiếu relations/field truth | Hoàn thiện importer/snap/instructions/spatial index và dataset mẫu theo Test Plan; không phát hành candidate như đã nghiệm thu |
| Safari | Chưa có kết quả riêng | Giữ test trước release theo DEC-071 |
| Android physical test | Waived DEC-070 | Không yêu cầu lại để mở bước; không ghi fabricated pass |
| Package/quota/50 users | Chưa chứng minh toàn sản phẩm | Đo artifact, storage, free-tier usage và load; vượt giới hạn thì trình tác động/đổi thiết kế, không giảm scope ngầm |
| Backup/restore/security | Chưa chạy hệ thống thật | Runbook/task/fixture và restore trial trước nghiệm thu |
| Product CI/CD | Chưa có workflow thật | Tạo đúng repo Vinlook khi task được duyệt; kiểm chứng trusted release/rollback, không lấy harness project thay sản phẩm |

**Đề xuất disposition:** cho chuyển sang lập Backlog/GitHub Plan/35-Day Plan và chuẩn bị Implementation theo baseline; task có dependency chưa rõ giữ NOT READY/BLOCKED cho đến khi input được xác nhận. Test sản phẩm chưa chạy không bị gọi là đã đạt để đóng Design. Nếu task phát hiện cần đổi architecture/schema/API/requirement, trình Change Proposal trước sửa.

## 5. Điều kiện chuyển sang code sản phẩm

Phê duyệt Design phase, rồi Duy duyệt backlog/AC/dependencies/assignment/estimate/checkpoint scope và GitHub Issue/task tương ứng. Coding chỉ khi task READY, có Issue/AC rõ, review trách nhiệm được xác nhận. Không được lấy phê duyệt D-021 để bỏ qua các bước GitHub/plan hoặc tự chạy toàn bộ Implementation.

Ngày22/10–25/11/2026 và checkpoint26/10 giữ nguyên. Chưa có kế hoạch/ước lượng đủ để cam kết Day5 đầyscope; giai đoạn kế hoạch phải đánh giá critical path và trình xử lý nếu không khả thi. Không tự kéo deadline hoặc dùng tuần tối ưu để bù Must-have.

## 6. Đề nghị phê duyệt Duy

1. Duyệt **bản data catalog hợp nhất và hai bổ sung kỹ thuật** tại mục3.
2. Duyệt **bộ deliverables Design làm baseline**, chấp nhận disposition rõ ràng tại mục4, và kết thúc phase Design để chuyển sang **lập backlog/GitHub/35-Day Plan**.

Đây là phê duyệt thiết kế và chuyển bước kế hoạch, **không phải nghiệm thu sản phẩm hoặc lệnh bắt đầu code ngay**. Nếu chưa đồng ý gate, chỉ rõ deliverable/điều kiện cần hoàn thiện để sửa trước.

## Kết quả phase review — DEC-081

Duy duyệt hai bổ sung kỹ thuật và toàn bộ Design baseline/disposition mục4. Phase Design được chấp nhận; chuyển lập backlog/GitHub/35-Day Plan. Điều kiện task READY, Issue/AC, assignment/estimate được duyệt vẫn áp dụng trước code sản phẩm; các test release còn chờ không biến thành đã đạt.
