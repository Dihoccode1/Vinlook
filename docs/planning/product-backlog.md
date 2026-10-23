# Vinlook — P-001 Product Backlog proposal

Ngày23/10/2026. **CHỜ DUY DUYỆT**. 60 tasks, tổng ước lượng focused 464 giờ, confidence thấp; chưa có Actual GitHub Issue hoặc assignee. Estimates ban đầu 0,5–1 ngày 8h theo yêu cầu; nếu task vượt1ngày phải tách bằng proposal, không âm thầm tăng. Chưa tính contingency/rework hoặc chờ provider/review. Không coi đây là commitment.

Thành viên đề xuất: Duy core/backend/routing + lead review; Tú tooling/worker/integration theo kỹ năng Docker/Actions; Hạo UI/content dưới review. Đây là đề xuất mới, chưa giao việc thật. Thiếu kinh nghiệm React/backend/đa ngôn ngữ cần buffer và hỗ trợ; không gán Hạo thành người biết16ngôn ngữ.

Mỗi task DoR: approved requirement/design/AC + dependency complete + input/data/credential có phép + Issue được tạo sau duyệt + reviewer được xác nhận. DoD: output/AC đạt, relevant tests/evidence, docs updated, human-reviewed PR linkedIssue, no Critical/Blocker. AI hỗ trợ code/test/docs theo Issue; không tự đổi design hoặc thay human review.

## TASK-001 — Khởi tạo repo với baseline docs và quy ước review

- Type/phase: devops / Implementation; priority: Must-have baseline.
- Related: REQ-028, REQ-029, REQ-031, REQ-032; FEAT-001; US-032, US-033, US-035, US-036; UC-035, UC-036; AC-028, AC-029, AC-031, AC-032. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: README và hồ sơ đã duyệt có traceability, chưa chứa secret.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: Design DEC-081 và planning approval.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 4h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-002 — Scaffold npm workspaces/React/ba Express units

- Type/phase: devops / Implementation; priority: Must-have baseline.
- Related: REQ-028, REQ-029, REQ-031, REQ-032; FEAT-001; US-032, US-033, US-035, US-036; UC-035; AC-028, AC-029, AC-031, AC-032. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Các unit build/run độc lập, lockfile và runtime thống nhất.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-001.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-003 — Hợp đồng runtime config/env và health tối thiểu

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-021, REQ-024, REQ-028, REQ-029, REQ-031, REQ-032; FEAT-001, FEAT-003, FEAT-005, FEAT-006; US-008, US-011, US-013, US-017, US-019, US-026, US-029, US-032, US-033, US-035, US-036; UC-032, UC-035; AC-021, AC-024, AC-028, AC-029, AC-031, AC-032. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Config thiếu fail rõ; dev/prod secrets tách, health không lộ credential.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-002.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-004 — Identity schemas/indexes và fixture

- Type/phase: database / Implementation; priority: Must-have baseline.
- Related: REQ-016, REQ-018, REQ-019, REQ-021; FEAT-003, FEAT-005; US-008, US-011, US-013, US-017, US-018, US-019, US-022, US-023, US-026; UC-019, UC-024, UC-026; AC-016, AC-018, AC-019, AC-021. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Account/session/audit/recovery/rate constraints đúng catalog.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-002.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-005 — Register/login bcrypt/JWT/rate limit

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-016, REQ-017, REQ-021; FEAT-003, FEAT-005; US-008, US-011, US-013, US-017, US-018, US-019, US-020, US-026; UC-019, UC-020; AC-016, AC-017, AC-021. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Pending signup và active login đúng policy, Unicode/expiry/rate tests.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-003, TASK-004.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-006 — Current authorization/authVersion/RBAC

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-016, REQ-017; FEAT-005; US-017, US-018, US-019, US-020, US-021, US-023; UC-021, UC-023; AC-016, AC-017. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Protected request kiểm tra quyền hiện tại, lock/reset có hiệu lực.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-005.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-007 — Daily session lifecycle và midnight guard

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-018; FEAT-005; US-018, US-022; UC-024, UC-025; AC-018. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Một session/ngày, reopen và đóng qua ngày ở API.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-006.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-008 — Audit ingestion/dedup/query scopes

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-019; FEAT-005; US-011, US-022, US-023; UC-026; AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: eventId dedup, actor/operator và original session đúng scope.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-004, TASK-006.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-009 — Staff approval/lock/recovery APIs

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-016, REQ-017, REQ-020; FEAT-005; US-017, US-018, US-019, US-020, US-021, US-023, US-024; UC-021, UC-023, UC-027, UC-028; AC-016, AC-017, AC-020. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Manager actions và one-use reset cập nhật authVersion nguyên tử.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-006, TASK-007.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-010 — Operator Manager bootstrap/recovery tool

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-016, REQ-020, REQ-029; FEAT-005; US-020, US-025; UC-022, UC-029; AC-016, AC-020, AC-029. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Không public backdoor, verified target, operator audit và runbook.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-008, TASK-009.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 4h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-011 — POI/revision/localized schemas và indexes

- Type/phase: database / Implementation; priority: Must-have baseline.
- Related: REQ-012, REQ-014, REQ-017, REQ-018, REQ-019; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-014, US-018, US-022; UC-012, UC-016; AC-012, AC-014, AC-017, AC-018, AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Một draft/in_review, GeoJSON entrance, unique language/version constraints.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-002.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-012 — Draft save/conflict/invalidation API

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-014, REQ-018, REQ-019; FEAT-004, FEAT-005; US-012, US-014, US-018, US-022; UC-012; AC-014, AC-018, AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: expectedEditVersion và source/text invalidation giữ published cũ.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-007, TASK-011, TASK-015 (thứ tự A được duyệt 23/10/2026).
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: [Issue #24](https://github.com/Dihoccode1/Vinlook/issues/24). Status: NOT READY — chờ TASK-015 và hợp đồng API chi tiết.

## TASK-013 — Review/submit/publish transaction

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-012, REQ-017; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-014, US-018, US-022; UC-015, UC-016; AC-012, AC-017. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Chỉ Manager publish đủ16 current approved outputs; transaction/outbox.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-012, TASK-019.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-014 — Soft delete/restore/public read/tombstone API

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-001, REQ-004, REQ-009, REQ-010, REQ-014, REQ-015, REQ-018, REQ-019, REQ-026; FEAT-001, FEAT-002, FEAT-003, FEAT-004, FEAT-005; US-001, US-003, US-004, US-005, US-007, US-009, US-010, US-012, US-014, US-015, US-016, US-022, US-023, US-031; UC-001, UC-002, UC-005, UC-017, UC-018; AC-001, AC-004, AC-009, AC-010, AC-014, AC-015, AC-018, AC-019, AC-026. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Không hard delete, public không draft; restore draft, sync snapshot đủ.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-011, TASK-006.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-015 — Outbox sender + mutation idempotency

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-014, REQ-018, REQ-019; FEAT-004, FEAT-005; US-011, US-012, US-014, US-018, US-022, US-023; UC-012, UC-026; AC-014, AC-018, AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Không mất intent khi Identity lỗi, replay không duplicate, reconcile in_progress.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-008, TASK-011, TASK-007.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: [Issue #25](https://github.com/Dihoccode1/Vinlook/issues/25). Status: implemented/tested; human review/merge pending.

## TASK-016 — Job claim/lease/renew/result/reclaim

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-011, REQ-013, REQ-018, REQ-028; FEAT-003, FEAT-005; US-011, US-012, US-013, US-014, US-018, US-022, US-029; UC-013, UC-014; AC-011, AC-013, AC-018, AC-028. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Snapshot/attempt/version valid, reclaim cap3 và manual retry lỗi provider.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-011, TASK-015.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-017 — Gemini/Azure adapters và free-tier config

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-011, REQ-013, REQ-018, REQ-028; FEAT-003, FEAT-005; US-011, US-012, US-013, US-014, US-018, US-022, US-029; UC-013, UC-014; AC-011, AC-013, AC-018, AC-028. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Model/resource/voice thực tế xác nhận, cloud adapter concurrency1, quota states.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-003, TASK-016.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-018 — Python MMS + FFmpeg + job protocol

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-011, REQ-013, REQ-018, REQ-028; FEAT-003, FEAT-005; US-011, US-012, US-013, US-014, US-018, US-022, US-029; UC-013, UC-014; AC-011, AC-013, AC-018, AC-028. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: pcm synthesize local, renew không bị chặn, MP3 output đúng contract.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-016.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-019 — Signed media upload/reference verification

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-011, REQ-012, REQ-013, REQ-014, REQ-017, REQ-018, REQ-019; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-013, US-014, US-018, US-022, US-029; UC-012, UC-013, UC-016; AC-011, AC-012, AC-013, AC-014, AC-017, AC-018, AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Không public preset/URL tùy ý, metadata/version/size checks và immutable refs.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-003, TASK-011, TASK-006.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-020 — 16-locale UI resource baseline và RTL

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-009, REQ-010; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-007, US-009, US-010, US-012, US-014, US-015; UC-010; AC-009, AC-010. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Resources có version, English offline đầy đủ, RTL không đảo geometry.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-002.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-021 — Nguồn/kịch bản English POI 1–5

- Type/phase: documentation / Implementation; priority: Must-have baseline.
- Related: REQ-012, REQ-014, REQ-017, REQ-018, REQ-019; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-014, US-018, US-022; UC-012, UC-016; AC-012, AC-014, AC-017, AC-018, AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Nguồn trích rõ, script đủ cho90–150s, chờ review nội dung thực tế.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-001.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-022 — Nguồn/kịch bản English POI 6–10

- Type/phase: documentation / Implementation; priority: Must-have baseline.
- Related: REQ-012, REQ-014, REQ-017, REQ-018, REQ-019; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-014, US-018, US-022; UC-012, UC-016; AC-012, AC-014, AC-017, AC-018, AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Năm kịch bản có nguồn, không tự bịa dữ kiện hoặc gán đã duyệt.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-021.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-023 — Nguồn/kịch bản English POI 11–15

- Type/phase: documentation / Implementation; priority: Must-have baseline.
- Related: REQ-012, REQ-014, REQ-017, REQ-018, REQ-019; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-014, US-018, US-022; UC-012, UC-016; AC-012, AC-014, AC-017, AC-018, AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Năm kịch bản còn lại, Ben Duoc/History Museum đúng đối tượng.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-022.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-024 — Tọa độ marker/entrance 15 POI và attribution

- Type/phase: documentation / Implementation; priority: Must-have baseline.
- Related: REQ-004, REQ-014, REQ-018, REQ-019, REQ-027; FEAT-001, FEAT-002, FEAT-004, FEAT-005; US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-012, US-014, US-018, US-022; UC-012, UC-006; AC-004, AC-014, AC-018, AC-019, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Entrance có bằng chứng review; không dùng tâm công trình giả là lối vào.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-021, TASK-022, TASK-023.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-025 — Chạy/đối soát text/audio batch POI 1–5

- Type/phase: documentation / Implementation; priority: Must-have baseline.
- Related: REQ-011, REQ-012, REQ-013, REQ-017, REQ-018; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-013, US-014, US-018, US-022, US-029; UC-013, UC-015, UC-016; AC-011, AC-012, AC-013, AC-017, AC-018. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: 80 output đúng versions/locale/time, lỗi chờ xử lý ghi rõ, không fake review.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-017, TASK-018, TASK-019, TASK-021, TASK-024.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-026 — Chạy/đối soát text/audio batch POI 6–10

- Type/phase: documentation / Implementation; priority: Must-have baseline.
- Related: REQ-011, REQ-012, REQ-013, REQ-017, REQ-018; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-013, US-014, US-018, US-022, US-029; UC-013, UC-015, UC-016; AC-011, AC-012, AC-013, AC-017, AC-018. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: 80 output tiếp theo, reviewers/quality limitations và quota log.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-017, TASK-018, TASK-019, TASK-022, TASK-024.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-027 — Chạy/đối soát text/audio batch POI 11–15

- Type/phase: documentation / Implementation; priority: Must-have baseline.
- Related: REQ-011, REQ-012, REQ-013, REQ-017, REQ-018; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-013, US-014, US-018, US-022, US-029; UC-013, UC-015, UC-016; AC-011, AC-012, AC-013, AC-017, AC-018. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: 80 output cuối, đủ240 chỉ khi mọi language review thật đạt.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-017, TASK-018, TASK-019, TASK-023, TASK-024.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-028 — Profile OSM access/barrier/relations fixtures

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-004, REQ-027; FEAT-001, FEAT-002; US-001, US-002, US-003, US-004, US-005, US-006, US-007; UC-006; AC-004, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Khắc phục extract thiếu relations, conditional policy có expected cases, không chỉ regex highway.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-001.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-029 — Graph compiler/provenance và file reader

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-004, REQ-007, REQ-008, REQ-021, REQ-027; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008, US-012; UC-006, UC-007; AC-004, AC-007, AC-008, AC-021, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Coverage đầy đủ, version/hash/chunks/size, không dùng candidate chưa validate.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-028.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-030 — A* engine path correctness/cancellation

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-004, REQ-027; FEAT-001, FEAT-002; US-001, US-002, US-003, US-004, US-005, US-006, US-007; UC-006; AC-004, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: A*/Dijkstra và directed cases, current request only, hủy thật và graph load timing.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-029.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-031 — Spatial snap index và directed connector

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-004, REQ-027; FEAT-001, FEAT-002; US-001, US-002, US-003, US-004, US-005, US-006, US-007; UC-006; AC-004, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Không scan toàn graph mỗi fix, không nối tùy ý qua vật cản/khác tầng.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-030.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-032 — Instructions theo junction và metadata đường

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-004, REQ-027; FEAT-001, FEAT-002; US-001, US-002, US-003, US-004, US-005, US-006, US-007; UC-006; AC-004, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Không chỉ geometric turns, tên/step/distance/entrance có fixture đúng.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-031.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-033 — GPS navigation coordinator/arrival/reroute

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-002, REQ-004, REQ-025, REQ-027; FEAT-001, FEAT-002; US-001, US-002, US-003, US-004, US-005, US-006, US-007; UC-003, UC-006; AC-002, AC-004, AC-025, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Ngưỡng D011, lost/poor GPS và stale result, đích xóa stop.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-032, TASK-024.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-034 — Manifest/package build snapshot và static distribution

- Type/phase: devops / Implementation; priority: Must-have baseline.
- Related: REQ-007, REQ-008, REQ-009, REQ-021; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-007, US-008, US-009, US-010, US-012, US-015; UC-007, UC-009; AC-007, AC-008, AC-009, AC-021. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: English assets đủ, checksums/compatibility và upload budget đo thực.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-020, TASK-025, TASK-026, TASK-027, TASK-029.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-035 — SW/IndexedDB/Cache update/reopen recovery

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-007, REQ-008, REQ-009, REQ-021; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-001, US-007, US-008, US-009, US-010, US-012, US-015; UC-007, UC-008, UC-009; AC-007, AC-008, AC-009, AC-021. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Giữ gói cũ, integrity/quota/crash recovery và app shell offline.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-034.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-036 — Visitor map/search/nearby/POI selection

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-001, REQ-002, REQ-003, REQ-004, REQ-010, REQ-014, REQ-025; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-001, US-002, US-003, US-004, US-005, US-007, US-010, US-012, US-014; UC-001, UC-002, UC-003, UC-004, UC-005; AC-001, AC-002, AC-003, AC-004, AC-010, AC-014, AC-025. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: MapLibre/PMTiles đúng, max4 trong3km, guest no login.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-014, TASK-020.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-037 — Audio player/mini-player/locale fallback

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-009, REQ-010, REQ-023; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-007, US-009, US-010, US-012, US-014, US-015; UC-010, UC-011; AC-009, AC-010, AC-023. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Một audio/tab, Pause giữ lượt, replace/Close end, offline English manual Play.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-036.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-038 — Offline and navigation UI states

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-004, REQ-007, REQ-008, REQ-009, REQ-021, REQ-027; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008, US-009, US-010, US-012, US-015; UC-006, UC-007, UC-008, UC-009; AC-004, AC-007, AC-008, AC-009, AC-021, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Steps/status/progress/Retry, no fake ready hoặc auto audio arrival.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-033, TASK-035, TASK-036.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-039 — Staff login/register/session shell

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-016, REQ-017, REQ-018, REQ-021; FEAT-003, FEAT-005; US-008, US-011, US-013, US-017, US-018, US-019, US-020, US-022, US-026; UC-019, UC-020, UC-024, UC-025; AC-016, AC-017, AC-018, AC-021. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Fields/states/JWT memory-only, session closed không auto mở.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-005, TASK-007, TASK-020.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-040 — POI editor + metadata/entrance/conflict UI

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-014, REQ-018, REQ-019; FEAT-004, FEAT-005; US-012, US-014, US-018, US-022; UC-012; AC-014, AC-018, AC-019. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Unsaved warning, read-only in_review, preserve input khi409.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-012, TASK-039.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-041 — Job/review/publish/delete/restore UI

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-009, REQ-011, REQ-012, REQ-013, REQ-015, REQ-017, REQ-018, REQ-019, REQ-026, REQ-028; FEAT-003, FEAT-004, FEAT-005; US-009, US-011, US-012, US-013, US-014, US-015, US-016, US-018, US-022, US-023, US-029, US-031; UC-013, UC-014, UC-015, UC-016, UC-017, UC-018; AC-009, AC-011, AC-012, AC-013, AC-015, AC-017, AC-018, AC-019, AC-026, AC-028. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Manager permissions reflected, stale media/failed quota và soft delete confirm.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-013, TASK-014, TASK-016, TASK-040.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-042 — Accounts/recovery/audit UI

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-016, REQ-017, REQ-019, REQ-020; FEAT-005; US-011, US-017, US-018, US-019, US-020, US-021, US-022, US-023, US-024; UC-021, UC-023, UC-026, UC-027, UC-028; AC-016, AC-017, AC-019, AC-020. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Role views/query scopes, recovery one-time, không exposed code logs.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-008, TASK-009, TASK-039.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-043 — Presence/listener backend + dependency summary

- Type/phase: backend / Implementation; priority: Must-have baseline.
- Related: REQ-021, REQ-022, REQ-023, REQ-024; FEAT-003, FEAT-005, FEAT-006; US-008, US-010, US-011, US-013, US-017, US-018, US-019, US-026, US-027, US-028, US-029; UC-030, UC-031, UC-032; AC-021, AC-022, AC-023, AC-024. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: UUID counts/dedup/end-before-start/90s stale, timestamped health.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-003, TASK-006.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-044 — Monitoring UI và visitor telemetry

- Type/phase: frontend / Implementation; priority: Must-have baseline.
- Related: REQ-021, REQ-022, REQ-023, REQ-024; FEAT-003, FEAT-005, FEAT-006; US-008, US-010, US-011, US-013, US-017, US-018, US-019, US-026, US-027, US-028, US-029; UC-030, UC-031, UC-032; AC-021, AC-022, AC-023, AC-024. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: 30s refresh, distinct browser và stale display; không offline-history replay.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-037, TASK-039, TASK-043.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-045 — Docker/Compose replica set và per-service DB access

- Type/phase: devops / Implementation; priority: Must-have baseline.
- Related: REQ-028, REQ-029, REQ-031, REQ-032; FEAT-001; US-032, US-033, US-035, US-036; UC-035; AC-028, AC-029, AC-031, AC-032. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Dev reproducible transactions, restricted DB credentials, nonsecret env template.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-003, TASK-004, TASK-011, TASK-043.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-046 — CI affected-unit tests/build và contract consumers

- Type/phase: devops / Implementation; priority: Must-have baseline.
- Related: REQ-028, REQ-029, REQ-031, REQ-032; FEAT-001; US-032, US-033, US-035, US-036; UC-035; AC-028, AC-029, AC-031, AC-032. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: PR checks, replica set integration, no Prod secrets, exact lockfile.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-045.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-047 — Automated hosted CD + worker artifact/runbook

- Type/phase: devops / Implementation; priority: Must-have baseline.
- Related: REQ-028; FEAT-001; US-032, US-033, US-035, US-036; UC-036; AC-028. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Trusted main gates, deploy status/smoke, rollback known SHA, no bypassCI.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-046.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-048 — Encrypted backup + writer quiescence scripts

- Type/phase: devops / Implementation; priority: Must-have baseline.
- Related: REQ-026; FEAT-004, FEAT-005; US-014, US-023, US-031; UC-033; AC-026. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: ThreeDB/media hashes, incomplete state, Duy key custody, no secret on CLI.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-010, TASK-015, TASK-034, TASK-043, TASK-045.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-049 — Restore trial + media/state reconciliation

- Type/phase: test / Testing; priority: Must-have baseline.
- Related: REQ-026; FEAT-004, FEAT-005; US-014, US-023, US-031; UC-034; AC-026. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Isolated local, no Prod egress, retained audit/idempotency and stale lease rules.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-048.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-050 — API integration/security regression suite

- Type/phase: test / Testing; priority: Must-have baseline.
- Related: REQ-016, REQ-017, REQ-019, REQ-020, REQ-021; FEAT-003, FEAT-005; US-008, US-011, US-013, US-017, US-018, US-019, US-020, US-021, US-022, US-023, US-024, US-026; UC-019, UC-020, UC-023, UC-026, UC-028; AC-016, AC-017, AC-019, AC-020, AC-021. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: TC register/auth/version/outbox/lease/permission failures có evidence.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-010, TASK-013, TASK-014, TASK-015, TASK-016, TASK-019, TASK-043.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-051 — Online guest/staff critical E2E

- Type/phase: test / Testing; priority: Must-have baseline.
- Related: REQ-001, REQ-004, REQ-009, REQ-010, REQ-012, REQ-014, REQ-017, REQ-023, REQ-027; FEAT-001, FEAT-002, FEAT-003, FEAT-004, FEAT-005; US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-009, US-010, US-011, US-012, US-014, US-015, US-018, US-022; UC-001, UC-006, UC-011, UC-016; AC-001, AC-004, AC-009, AC-010, AC-012, AC-014, AC-017, AC-023, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Executable UI→services→DB, screenshot/evidence và defects link.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-038, TASK-041, TASK-042, TASK-044.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-052 — Safari offline/reopen/update/GPS test

- Type/phase: test / Testing; priority: Must-have baseline.
- Related: REQ-004, REQ-007, REQ-008, REQ-009, REQ-021, REQ-027; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008, US-009, US-010, US-012, US-015; UC-006, UC-007, UC-008, UC-009; AC-004, AC-007, AC-008, AC-009, AC-021, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Real Safari online/offline/cold separate, Android ghi waived chứkhôngpass.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-035, TASK-038.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-053 — Worker/media fault and integration tests

- Type/phase: test / Testing; priority: Must-have baseline.
- Related: REQ-011, REQ-012, REQ-013, REQ-017, REQ-018, REQ-028; FEAT-003, FEAT-004, FEAT-005; US-011, US-012, US-013, US-014, US-018, US-022, US-029; UC-013, UC-014, UC-016; AC-011, AC-012, AC-013, AC-017, AC-018, AC-028. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Provider stubs và actual sample riêng, quota/stale/upload recovery.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-017, TASK-018, TASK-019, TASK-047.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-054 — 50-user performance measurement

- Type/phase: test / Testing; priority: Must-have baseline.
- Related: REQ-001, REQ-003, REQ-004, REQ-009, REQ-010, REQ-014, REQ-023, REQ-027; FEAT-001, FEAT-002, FEAT-003, FEAT-004; US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-009, US-010, US-012, US-014, US-015; UC-001, UC-004, UC-006, UC-011; AC-001, AC-003, AC-004, AC-009, AC-010, AC-014, AC-023, AC-027. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: 100+ samples/type,95% đúng ngưỡng, lỗi count, warm/cold split.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-050, TASK-051, TASK-052, TASK-053.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-055 — 15POI/16locale quality/UAT evidence

- Type/phase: test / Testing; priority: Must-have baseline.
- Related: REQ-009, REQ-010, REQ-012, REQ-017, REQ-023; FEAT-001, FEAT-002, FEAT-003, FEAT-004, FEAT-005; US-007, US-009, US-010, US-011, US-012, US-014, US-015, US-018, US-022; UC-010, UC-011, UC-015, UC-016; AC-009, AC-010, AC-012, AC-017, AC-023. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: 240text/audio review disposition, RTL và không fake native validation.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-025, TASK-026, TASK-027, TASK-041.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-056 — README/API/env/troubleshooting handover

- Type/phase: documentation / Deployment; priority: Must-have baseline.
- Related: REQ-028, REQ-029, REQ-030, REQ-031, REQ-032; FEAT-001; US-032, US-033, US-034, US-035, US-036; UC-035, UC-036, UC-037; AC-028, AC-029, AC-030, AC-031, AC-032. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Run/build/deploy/backup/known limits có lệnh tái lập không secret.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-047, TASK-048.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-057 — Product deployment verification and rollback trial

- Type/phase: devops / Deployment; priority: Must-have baseline.
- Related: REQ-028; FEAT-001; US-032, US-033, US-035, US-036; UC-036; AC-028. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Actual Vinlook hosted URLs/service versions, smoke/rollback evidence.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-049, TASK-054, TASK-055, TASK-056.
- Proposed assignee / reviewer: Tú / Duy. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-058 — Final/checkpoint quality-gate evidence pack

- Type/phase: test / Deployment; priority: Must-have baseline.
- Related: REQ-030; FEAT-001; US-034; UC-037; AC-030. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Duy review full scope và blockers, Issue/PR/test evidence thật.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-057.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 4h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-059 — Known issues/technical debt/maintenance guide

- Type/phase: documentation / Maintenance; priority: Must-have baseline.
- Related: REQ-030; FEAT-001; US-034; UC-037; AC-030. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Không chuyển missing Must-have vào future backlog, owner đề xuất review.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-058.
- Proposed assignee / reviewer: Hạo / Duy. Estimate: 4h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## TASK-060 — Maintenance regression and accepted fixes

- Type/phase: test / Maintenance; priority: Must-have baseline.
- Related: REQ-030; FEAT-001; US-034; UC-037; AC-030. Đọc thêm UC nguồn với ID ranges.
- Description / expected output: Chỉ sửa được phép, repeat relevant tests/PR review, no silent scopechange.
- Acceptance: chứng minh output trên bằng fixture/luồng nguồn và case liên quan trong test-cases.md, không chỉ code build.
- Dependency: TASK-058.
- Proposed assignee / reviewer: Duy / Tú. Estimate: 8h, chưa được chủ task xác nhận.
- DoR/DoD: theo đầu tài liệu; NOT READY nếu thiếu prerequisite, không chỉ đánh dấu ready vì đã assign.
- AI assistance: triển khai/giải thích/test/docs trong phạm vi task; human reviewer phía trên chịu trách nhiệm proposed.
- Target MVP: baseline yêu cầu MVP-1; việc xếp lịch không tự đổi target.
- Actual GitHub Issue/PR: **chưa tạo**. Status: PROPOSED.

## Phê duyệt — DEC-082

Duy duyệt backlog/ước lượng ban đầu và assignee/reviewer đề xuất. Các nhãn PROPOSED phía trên mô tả trạng thái artifact trước duyệt; chưa có Actual Issue/assignment. Không biến low-confidence estimate thành commitment hoặc dùng để tự giảmscope Day5.

Actual mapping cập nhật: TASK-001 = https://github.com/Dihoccode1/Vinlook/issues/1 (open, Dihoccode1). Các dòng chưa có Issue phía trên là snapshot trước setup; tasks002–060 vẫn chưa có Actual Issue. Không đánh dấu task001 DONE: mới tạo Issue và inventory review docs, chưa import/commit/PR.
