# Kiến trúc Giao diện Vinlook (`@vinlook/ui` + Tailwind CSS v4)

Tài liệu này hướng dẫn cách tổ chức giao diện, design token, primitives dùng chung và các quy ước khi phát triển hoặc mở rộng `apps/user-web`, `apps/admin-web` và `apps/monitor-web`.

## 1. Cấu trúc và nguyên tắc chung

- **Package dùng chung (`packages/ui`, tên package `@vinlook/ui`)**: Cung cấp CSS token gốc (`@vinlook/ui/styles.css`), helper `cn()` (`@vinlook/ui/utils`), và các Radix/shadcn primitives đã chuẩn hóa cho React 19:
  - `@vinlook/ui/button` (variants: `default`, `destructive`, `destructiveSoft`, `successSoft`, `outline`, `secondary`, `ghost`, `link`; sizes: `default`, `sm`, `xs`, `lg`, `pill`, `icon`)
  - `@vinlook/ui/input`, `@vinlook/ui/textarea`, `@vinlook/ui/label`, `@vinlook/ui/select`
  - `@vinlook/ui/card`, `@vinlook/ui/badge`, `@vinlook/ui/table`, `@vinlook/ui/alert`
  - `@vinlook/ui/dialog`, `@vinlook/ui/alert-dialog` (dựa trên `@radix-ui/react-dialog`)
- **Utility-first JSX**: Mỗi app import `@vinlook/ui/styles.css` một lần trong `src/main.tsx`. Bố cục, khoảng cách, màu sắc và responsive breakpoints sử dụng Tailwind CSS v4 utilities (`@tailwindcss/vite`).
- **Không dùng `@apply` và không còn `@layer legacy`**: Khi thêm tính năng mới, viết component bằng Tailwind utilities và `@vinlook/ui` primitives; không tạo file stylesheet riêng cho từng feature hay hộp thoại.

## 2. Design Tokens và Theme theo từng app

`packages/ui/src/styles.css` khai báo `@theme inline` ánh xạ các biến CSS trong `:root` sang Tailwind utilities (`bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `border-border`, `ring-ring`, `z-(--z-modal)`, v.v.):

- **Theme sáng Vinlook (`apps/user-web`, `apps/admin-web`)**:
  - `packages/ui/src/styles.css` đặt giá trị mặc định cho nền lá xám nhạt (`--background: #f5f7f3`), xanh rừng (`--primary: #174c3c`), font `Be Vietnam Pro`, và focus ring hổ phách (`--ring: #c88b36`).
  - `apps/user-web/src/styles.css` override nhẹ `--background: #f7f7f2` và `--sidebar: #f7f7f2`.
  - `apps/admin-web/src/styles.css` override nền kem/lá (`--background: #f5f7f1`, `--card: #fffefb`, `--border: #e2e8dc`, `--input: #d4dfcf`, `--ring: #d18c50`).
- **Theme tối Monitor (`apps/monitor-web`)**:
  - `apps/monitor-web/src/styles.css` override toàn bộ token `:root` sang slate tối (`--background: #0f172a`, `--card: #1e293b`, `--primary: #38bdf8`, `--border: #334155`, ...) nên cùng bộ component `@vinlook/ui` tự động thích ứng dark mode mà không cần sao chép CSS.

## 3. Cách thêm component hoặc primitive mới

1. **Component đặc thù nghiệp vụ** (ví dụ bảng dữ liệu, form theo tab, panel theo dõi): Đặt ngay trong `apps/<app>/src/features/...`, dùng lại `@vinlook/ui/*` và `cn()`. Nếu lặp lại nhiều lần trong cùng app, tách helper hoặc component nhỏ tại chỗ.
2. **Primitive UI dùng chung cho >= 2 app**: Thêm file `<name>.tsx` vào `packages/ui/src/components/`, luôn có `import * as React from 'react'` (để tương thích cả Vite lẫn `tsx --test`), khai báo export trong `packages/ui/package.json` (`"./<name>": "./src/components/<name>.tsx"`), và chỉ thêm phụ thuộc npm khi thực sự cần hành vi A11y phức tạp.
3. **Hộp thoại & xác nhận**:
   - Hộp thoại thông thường dùng `@vinlook/ui/dialog` (`Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`). Luôn có `DialogTitle` (có thể dùng `sr-only` nếu thiết kế tùy biến) và chặn đóng hoặc nhấn `Escape` khi form đang `saving`/`busy`.
   - Hộp thoại xác nhận hành động nguy hiểm hoặc khóa/mở khóa dùng `@vinlook/ui/alert-dialog` và đặt focus mặc định vào nút `Hủy` qua `onOpenAutoFocus`.

## 4. Các ngoại lệ CSS thuần được phép giữ lại

CSS tùy biến chỉ được giữ trong `src/styles.css` khi Tailwind utilities không thể diễn đạt sạch hoặc thư viện bên thứ ba cần selector DOM:

1. **`apps/user-web/src/styles.css`**:
   - Quy tắc tích hợp **Leaflet** (`.leaflet-container`, `.leaflet-tooltip`, `.leaflet-bottom` và các marker `L.divIcon` render ngoài React như `.poi-photo-pin`, `.poi-stop-badge`, `.route-direction-arrow`, `.route-origin-pin`).
   - Choreography **Mobile bottom sheet** (`@media (max-width: 760px)` với biến runtime `--mobile-sheet-height`, `.app > .mobile-sheet.is-dragging`, `.app[data-sheet-dragging='true']`, `[data-sheet-state='collapsed'] [data-sheet-collapsible]`, được kiểm tra bởi `tests/mobile-sheet.test.ts` và mô tả trong `docs/mobile-layout.md`).
2. **`apps/admin-web/src/styles.css`**:
   - `@import` font `Be Vietnam Pro`, các biến `:root` theme và quy tắc nền `body`. Chiều cao động cho bàn phím ảo mobile trên `PoiEditor` gắn trực tiếp biến CSS `--editor-visible-height` / `--editor-visible-top` thông qua Tailwind arbitrary values.
3. **`apps/monitor-web/src/styles.css`**:
   - Chỉ chứa `:root` dark-slate CSS token overrides.
