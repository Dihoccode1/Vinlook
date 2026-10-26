# GitHub drafts — NOT SENT

The in-app browser was signed out. These are reviewable drafts, not evidence of a comment/notification/PR already created.

## Start comment / questions on #76

Bắt đầu POC-HAO-01 — Hạo/2107h06, branch `codex/poc-hao-01-tourist`, từ seed `f8058292169d994ae75116b078e3103cded34018`, repo `C:\Users\ADMIN\Documents\Vinlook-PoC`; origin/status/branch đã kiểm tra, ban đầu sạch. Đã đọc #76/#81 và các contract PoC liên quan. Không clone lại, không sửa baseline/backend/shared lock/env hoặc thao tác live.

Kế hoạch đợt đầu: adapters Identity/Content theo API hiện có, interface semantic Usage, browser identity có điều phối tab, lifecycle player/telemetry; unit và browser tests bằng fixture có nhãn. Tiếp theo mới UI/map tích hợp, không gọi fixture là liveAC. Duy review/merge duy nhất.

@Dihoccode1 cần quyết định trước map/HTTP mới:

1. Pin MapLibre/PMTiles: **A** Duy duyệt cụ thể `maplibre-gl@6.16.0`, `pmtiles@4.5.0` (metadata npm công khai, BSD-3-Clause; cần review compatibility/artifacts), rồi Duy đưa shared-lock commit; **B** Duy chọn pin khác và cấp shared-lock commit. Chưa cài/thay dependency. Công nghệ MapLibre/PMTiles vẫn giữ nguyên.
2. Usage bridge: **A** tiếp tục semantic fixture theo CONTRACTS, chờ Duy duyệt `docs/poc/tu/usage-contract.md` trước HTTP; **B** Duy chỉ định một contract HTTP đã duyệt (version/path) để Hạo map ngay. Không tự suy ra response/perPOI/rate/CORS từ outline.

Blocker vận hành: cần login GitHub trong app để gửi comment/PR; Docker Desktop engine chưa chạy. Node24.18.1/npm11.16.0 portable đã chuẩn bị riêng và xác minh. Không chờ backend để viết/tests module độc lập. Không tạo lại Manager hoặc truy cập Atlas/provider.

## First-slice PR draft

Title: `POC: add Tourist adapters and labelled lifecycle fixture`

Base: `codex/poc-demo`; head: `codex/poc-hao-01-tourist`; reviewer: `Dihoccode1`.

Refs #76

Adds public Content and memory-only Identity adapters, cross-tab telemetry identity, semantic Usage lifecycle and a single-tab player controller. Includes a separate labelled local fixture and module/browser tests so the frontend can progress before live backend/artifacts. Production build rejects the fixture flag.

This is the first independent slice; #76 remains open. Real map/UI/Usage HTTP,15published POIs/240approved narrations, offline/navigation and liveAC are pending. Map dependency pins/shared lock and Usage bridge need Duy approval. No new dependency, backend/shared contract change or live operation.

Validation on final head:12new module tests,4Chrome fixture browser tests,5existing locale tests; workspace build/scaffold passed; fixture production build rejected as expected. Native bcrypt/DB integration, GitHub CI and real-device/live acceptance are not claimed. Reproduce/ownership/limitations: `docs/poc/hao/tourist/README.md`. Exact head SHA and screenshot links must be added from the actual final commit/upload, never guessed. Duy is the only reviewer/merger; no Closes/Fixes keyword.
