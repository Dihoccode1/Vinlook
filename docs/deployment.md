# Vinlook: CI/CD miễn phí cho môi trường học tập

Frontend dùng Vercel Hobby. SQL Server Developer, bốn backend và bản web dự phòng chạy bằng Docker trên máy Windows của nhóm. GitHub Actions trên Ubuntu kiểm tra PR; runner riêng trên Windows triển khai sau khi commit vào `main` vượt qua toàn bộ kiểm tra. Không có dịch vụ trả phí hoặc paid fallback trong cấu hình này.

## Cấu trúc source

- `apps/user-web`, `apps/admin-web`, `apps/monitor-web`: React/Vite, mỗi chức năng ở `src/features`, gọi API tại `src/services`.
- `packages/ui`: component shadcn/ui dùng chung, Radix, Tailwind CSS v4, theme và `cn`. Import trực tiếp `@vinlook/ui/button`, `@vinlook/ui/input`, `@vinlook/ui/dialog` để tái sử dụng thay vì chép component.
- `packages/server`: khởi động HTTP, kiểm tra cổng và graceful shutdown; không chứa nghiệp vụ từng service.
- `services/*/src/app.ts`: ghép route và middleware. `modules` giữ nghiệp vụ; repository giữ SQL; provider giữ kết nối dịch vụ ngoài; `config` giữ cấu hình.
- `scripts`: khởi tạo môi trường, build frontend và quy trình release. Workflow gọi các script này thay vì nhúng logic dài vào YAML.

Để thêm component shadcn, chạy CLI trong app cần dùng và giữ alias về package UI chung trong `components.json`. Không tạo một thư viện UI riêng cho mỗi app. CSS hiện có ở layer `legacy`; utility Tailwind có thể ghi đè có chủ đích. Lệnh `npm run format` định dạng source; `npm run check` chạy format, typecheck, test và production build. File SQL, dữ liệu nội dung, tài liệu và asset không bị formatter thay đổi.

## Khởi tạo trên máy Windows

Yêu cầu Node.js 24, npm, PowerShell 7, GitHub CLI, Docker Desktop chạy Linux containers. Bật Docker Desktop tự khởi động khi đăng nhập Windows. Máy và mạng phải hoạt động khi deploy hoặc khi người dùng gọi backend.

```powershell
npm ci
npm run env:init
```

Lệnh thứ hai tạo `.env` với secret ngẫu nhiên, chỉ khi file chưa tồn tại. Thông tin admin đầu tiên lưu tại `.local-deploy/bootstrap-admin.txt`; đổi mật khẩu sau khi đăng nhập. Cả hai vị trí bị loại khỏi Git và Docker build context. Không đưa chúng lên PR, Actions artifact hoặc chat.

Mặc định dùng MyMemory cho dịch văn bản, không yêu cầu paid API key. TTS mới cần cấu hình provider riêng có quota miễn phí; thiếu key sẽ báo chưa cấu hình. Deploy thành công không đồng nghĩa các API AI chưa có credential sẽ tạo được audio. Không bật billing cho API trả phí để xử lý lỗi quota.

Đăng nhập GitHub và Vercel dưới chính tài khoản Windows sẽ chạy runner:

```powershell
gh auth login
npx --no-install vercel login
./scripts/setup-runner.ps1
```

Runner nằm trong `.local-runner`, khởi động bằng Windows Task Scheduler lúc đăng nhập. Các PR chạy trên GitHub-hosted Ubuntu, không chạy trên máy triển khai. Repo public nên yêu cầu duyệt workflow từ người đóng góp ngoài nhóm trước khi cho chạy; chỉ duyệt sau khi đọc thay đổi workflow. Chỉ người được tin cậy có quyền đẩy/merge `main`.

## Cấu hình GitHub một lần

Tạo environment `production`, giới hạn nhánh triển khai là `main`. Không yêu cầu duyệt thủ công environment nếu nhóm muốn main tự deploy hoàn toàn. Các repository variables:

| Variable | Nội dung |
| --- | --- |
| `VINLOOK_DEPLOY_ENABLED` | `true`, chỉ bật sau khi cấu hình máy và kiểm tra deployment đạt |
| `VINLOOK_ENV_FILE` | Đường dẫn tuyệt đối tới `.env` trên máy runner; nằm ngoài thư mục checkout của Actions |
| `VINLOOK_STATE_DIR` | Thư mục tuyệt đối để lưu audio, backup và trạng thái release, ví dụ `C:/MERN stack/Vinlook/.local-deploy` |
| `VINLOOK_PUBLIC_ORIGIN` | HTTPS origin backend ổn định nếu đã có; để trống để dùng Quick Tunnel |
| `VERCEL_ORG_ID` | Team Vercel đích |
| `VERCEL_PROJECT_ID` | Project frontend Vercel đích |

Runner dùng phiên Vercel CLI của tài khoản Windows. Nếu cần token CI riêng, tự tạo token giới hạn đúng team và lưu trong environment secret `VERCEL_TOKEN`; không commit hoặc gửi token trong chat. Token chỉ xuất hiện tại bước release. Không sử dụng token này trong workflow PR.

## Release đầu tiên

```powershell
$env:VERCEL_ORG_ID = 'team_ID_CUA_NHOM'
$env:VERCEL_PROJECT_ID = 'prj_ID_CUA_DU_AN'
./scripts/deploy-local.ps1 -EnvFile .env -StateDirectory .local-deploy -QuickTunnel -Seed
```

`-Seed` chỉ dùng khi muốn nạp dữ liệu phát triển vào lần khởi tạo. Các release tự động không chạy seed. Dữ liệu SQL dùng volume cố định `vinlook_sqlserver-data`; script không xóa volume. Không đổi tên Compose project hoặc mật khẩu SQL sau khi tạo volume mà chưa làm quy trình đổi credential của database.

Quick Tunnel không cần tài khoản Cloudflare hoặc tên miền trả phí. URL tồn tại trong thời gian container tunnel chạy; đổi container/máy có thể đổi URL. Mỗi release tự đọc URL hiện tại và build lại frontend với origin mới. Nếu tunnel đổi URL sau khi máy khởi động lại, chạy lại workflow bằng **Run workflow** trên `main`. Nếu nhóm có named tunnel/domain sẵn, điền `VINLOOK_PUBLIC_ORIGIN` để giữ endpoint ổn định. Không dùng Quick Tunnel như một cam kết uptime production.

## Mỗi lần push hoặc merge main

1. `Source checks`: format, typecheck, unit tests, production builds.
2. `SQL integration`: database CI riêng; migrate/seed hai lần và test repository/auth thật. Không chạm database của nhóm.
3. `Container builds`: build web, migration và bốn backend trên Ubuntu.
4. `Deploy main`: chỉ chạy khi ba job trên đạt và variable deploy đã bật. Runner kiểm tra commit vẫn là main, khóa release để tránh hai lần triển khai cùng lúc, build image theo SHA, migrate và đợi readiness.
5. Kiểm tra HTTP thật: POI, ngôn ngữ, readiness. SQL và audio giữ ngoài image/checkout.
6. Build ba FE thành một deployment Vercel: `/`, `/admin/`, `/monitor/`. `/api/*` được proxy cùng origin tới backend; cookie quản trị không cần chia sẻ chéo domain.
7. Stage production chưa gán domain, kiểm tra các trang/API qua `vercel curl`, sau đó promote. Release lỗi trước promote giữ bản FE production cũ.

Các release không bị hủy giữa chừng khi có commit mới. Job kiểm tra main tránh triển khai commit đã cũ trước khi bắt đầu. Khi backend/FE release lỗi, script thử phục hồi các image ứng dụng đã chạy trước đó; không đảo ngược migration SQL. Migration mới phải tương thích với bản ứng dụng trước đó, và nhóm cần backup trước thay đổi dữ liệu khó đảo ngược.

## Bảo trì và giới hạn

- Không bật paid plan, static IP trả phí, persistent disk cloud trả phí hoặc keep-alive để lách free tier. Vercel Hobby vẫn có quota; hết quota có thể phải chờ chu kỳ tiếp theo.
- Máy tắt, mất mạng, Docker dừng hoặc runner offline sẽ làm deployment chờ/thất bại và backend không truy cập được. Đây là hệ quả của lựa chọn giữ SQL/BE tại máy hiện tại.
- `npm run format`, `npm run typecheck`, `npm test`, `npm run test:deployment`, `npm run build` là các lệnh kiểm tra trước PR.
- Kiểm tra runner: GitHub → Settings → Actions → Runners. Kiểm tra release: Actions → CI and deployment. Task Scheduler → Vinlook GitHub Runner cho tiến trình nền.
- Không upload `.env`, `.credentials*`, `.vercel`, log chứa credential hoặc nội dung backup SQL lên GitHub Actions artifacts.

Nguồn: [GitHub Actions billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel Build Output API](https://vercel.com/docs/build-output-api), [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/), [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite), [shadcn monorepo](https://ui.shadcn.com/docs/monorepo).
