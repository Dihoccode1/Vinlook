# Nhận việc qua Issue với AI agent

> Current PoC scope,26October2026: online-only by Duy. Offline requirements in historical sections/examples are superseded by [ONLINE-SCOPE.md](ONLINE-SCOPE.md). Full online walking navigation,15POIs/16locales,AdminA and Monitoring remain mandatory.


## Lấy repo an toàn (Tú/Hạo)

Cần Git, GitHub login, Node24.18.1/npm11.16.0, Docker Desktop cho backend. Không gửi password/token/URI vào AI chat. Kiểm tra `git --version`, `node --version`, `npm --version`, `docker version`. Thiếu tool thì dùng nguồn chính thức; không tự đổi lock/version.

Clone vào thư mục MỚI ngoài mọi repo đang làm. Nếu thư mục đích tồn tại, chọn tên mới; không xóa/reset/clean. PowerShell tại thư mục cha bạn tự chọn:

```powershell
git clone https://github.com/Dihoccode1/Vinlook.git Vinlook-PoC
Set-Location Vinlook-PoC
git remote -v
git status --short
git branch --show-current
git fetch origin
git switch --track origin/codex/poc-demo
```

Tú: `git switch -c codex/poc-tu-01-contracts`; Hạo: `git switch -c codex/poc-hao-01-tourist`. Với task tiếp theo lấy tên branch trong Issue; mỗi task một PR. Không cùng push `codex/poc-demo`, không làm trên main. Local có thay đổi thì hỏi chủ file/cất bằng commit riêng theo chỉ dẫn, không reset/clean hay ghi đè.

```powershell
npm ci
npm run build
npm run check:scaffold
```

Backend dùng Mongo disposable local cho test, không test phá hủy Atlas. Copy `.env.example` thích hợp thành file ignored riêng rồi nhập private; không dùng secret từ lịch sử chat. Worker keys/service keys không bao giờ đưa vào frontend. Frontend chỉ nhận public HTTPS origins/config. Không tự tạo lại Manager đã có.

## Prompt dán vào AI agent trong clone

> Tôi là [Tú/ngoctu0405 hoặc Hạo/2107h06], nhận Issue [URL]. Đọc Issue đầy đủ, docs/poc/README.md, TRACEABILITY.md, CONTRACTS.md, REVIEW-AND-ACCEPTANCE.md và tài liệu baseline/implementation được Issue dẫn. Kiểm tra git remote/status/branch trước chỉnh sửa. Làm đúng ownership và acceptance; không sửa baseline, bỏ gate16locale, tạo dữ liệu giả trong production, đổi giá/kiến trúc/contract/dependency hay thao tác live chưa được Duy duyệt. Duy là reviewer và người duy nhất merge. Lập checklist nhỏ, triển khai và kiểm thử module bằng fixture có nhãn/disposable local để không chờ người kia. Chỗ contract mới thiếu thì ghi câu hỏi có lựa chọn vào Issue và báo Duy, tiếp tục phần độc lập. Không gọi provider/generate/upload/đổi env chung khi chưa có phạm vi rõ. Không in secrets. Đến mỗi task hoàn thành, chỉ tick các mục có bằng chứng, mở PR base codex/poc-demo, yêu cầu Dihoccode1 review, nêu test/limitations/handoff và dừng trước merge. Không đóng backlog gốc hay issue PoC chỉ vì đã mở PR.

## Cập nhật Issue và tick hoàn thành

1. Mở Issues, lọc Assignee tài khoản mình, chọn `[POC-TU-*]` hoặc `[POC-HAO-*]`; đọc cả parent/tracker và comment mới.
2. Comment `Bắt đầu: <branch>; kế hoạch hôm nay; blocker nếu có`. Không cần chờ người kia.
3. Mỗi checkbox là `- [ ]`; bấm ô trên GitHub để tick hoặc Edit body đổi thành `- [x]`. Chỉ tick khi có file/PR/test tương ứng. Không thay toàn body bằng bản cũ của AI. Mất quyền sửa thì comment checklist bằng chứng và nhờ Duy cập nhật.
4. Phân biệt `implementation/tests done`, `PR reviewed/merged`, `live verified`, `Duy accepted`. Không tick bước sau thay bước trước. Issue giữ open đến Duy chấp nhận và đóng tay.
5. Comment bàn giao: PR URL + exact head SHA, file ownership, command/kết quả test, fixture vs live, hình/video, hướng dẫn reproduce, migrations/env names (không values), điểm chưa đạt.

## Gửi PR cho Duy

```powershell
git status --short
git diff --check
git add <cac-file-dung-task>
git diff --cached --stat
git commit -m "POC: mo ta thay doi"
git push -u origin <nhanh-task-cua-ban>
```

Không `git add .` khi có env/data riêng. Trên GitHub chọn Compare & pull request, **base `codex/poc-demo`**, compare nhánh task; gắn `Refs #<issue>` (không dùng Closes/Fixes để tránh tự đóng sai nhánh). Chọn reviewer Dihoccode1. Nếu dùng gh đã login: `gh pr create --base codex/poc-demo --head <branch>`; body nhiều dòng dùng file `--body-file`. Tuyệt đối không tự `gh pr merge`/bấm Merge.

CI xanh không thay Duy review. Nếu base thay đổi: fetch rồi merge origin/codex/poc-demo vào nhánh mình (không force-push), giải quyết chỉ file sở hữu và chạy lại checks. Báo Duy nếu conflict shared file; không tự lấy theirs/ours bỏ code người khác.
