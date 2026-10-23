# Vinlook — D-020: công cụ và cấu hình kỹ thuật còn mở

Ngày 23/10/2026. **ĐÃ DUYỆT — JavaScript phương án A, DEC-080**. Sau D-019/DEC-079; chưa cài/scaffold sản phẩm. Phạm vi là chốt các lựa chọn để hợp nhất hồ sơ Design, không tự duyệt toàn phase.

## 1. Ngôn ngữ code sản phẩm

| Phương án | Lợi ích | Chi phí |
|---|---|---|
| **A — Đề xuất: JavaScript ESM, JSX frontend, JSDoc cho contract** | Ít bước học mới với nhóm hiện tại; thống nhất Node/browser/harness | Không có kiểm tra kiểu đầy đủ của TypeScript; phải kiểm tra payload và test contract rõ |
| B — TypeScript cho React/Express, Python worker giữ nguyên | Kiểm tra kiểu sớm và mô tả dữ liệu rõ | Thêm cấu hình/build/học type system, không thay runtime validation |

Không suy ra lựa chọn từ việc biết HTML/CSS. Chỉ áp sau Duy chọn. Đây không đổi React19/Express/Mongoose/Python đã chốt.

## 2. Bộ công cụ đề xuất

| Thành phần | Đề xuất | Giới hạn |
|---|---|---|
| Node | Dòng **24 LTS**, cùng bản patch được ghim giữa Dev/CI/Docker | Không dùng local Node hiện có làm bằng chứng mọi môi trường cùng version |
| Frontend build | **Vite** React SPA, build static lên Vercel | Không Next.js/SSR/server frontend mới |
| Điều hướng UI | **React Router Data Mode**, chỉ client-side để điều phối trang/unsaved navigation | Không chuyển backend sang React Router framework hoặc thêm hosted runtime |
| UI ngôn ngữ | **i18next + react-i18next**, resources JSON trong repo | Không SaaS dịch UI, không tự gọi Gemini theo mỗi lượt xem |
| Forms/API validation | **Zod** cho payload allowlist và validation ở boundary | Mongoose vẫn quản lý persistence; frontend validate không thay server validation |
| JWT | **jose**, Identity ký/verify HS256 với allowlist cố định | Thuật toán/hạn/token memory theo D-007 không đổi; không đưa signing key vào frontend |
| Password | npm **bcrypt** chính thức, cost12 | Không bcryptjs thay thế âm thầm hoặc hạ cost để qua load |
| Browser state/network | React state/context và Fetch API | Không thêm Redux/Zustand/TanStack Query/Axios khi chưa có nhu cầu được duyệt |
| Offline | Service Worker/Cache Storage/IndexedDB native với wrapper nhỏ thuộc app | Không thêm Workbox/OPFS bắt buộc; phải có error handling/tests cho transaction/cache markers |
| Backend persistence | Express + Mongoose theo stack đã chọn | Không thêm ORM/DB/broker mới |
| Quality tooling | ESLint, Vitest, Supertest, Playwright | Chỉ tests có giá trị nghiệp vụ; không viết test mirror implementation |
| Media/model local | Python, Transformers/PyTorch cho MMS, FFmpeg theo D-018 | Không tự tải model mỗi request; pin version/license/resource trước release |

Nguồn chính kiểm tra 23/10/2026: [Node releases](https://nodejs.org/en/about/previous-releases), [Vite](https://vite.dev/guide/), [React Router](https://reactrouter.com/start/data/installation), [i18next](https://www.i18next.com/overview/getting-started), [jose](https://github.com/panva/jose). Đây là lựa chọn đề xuất của Vinlook; nhà cung cấp không bảo đảm phù hợp toàn hệ thống.

**Version policy đề xuất:** giữ React19/Tailwind4; chọn phiên bản stable tương thích khi tạo scaffold theo Issue được duyệt, ghi exact resolved versions bằng lockfile. Python ghi requirements/lock tương ứng; Docker pin runtime image version và digest khi release. Không dùng floating latest trong deploy. Nếu cần đổi major/runtime đã chọn, trình thay đổi; patch/security update phải review compatibility và test thay vì tự merge.

Không tự khóa một patch/version chưa kiểm tra hoặc cài trước gate. Các package phụ thuộc trực tiếp phát sinh ngoài danh sách phải có lý do và được review trước khi thêm, không lợi dụng quyền cài CLI nghiên cứu để cài stack sản phẩm.

## 3. Giao diện nền đề xuất

Giữ shadcn/Tailwind4; dùng theme mặc định sáng, font hệ thống có fallback đa script, accent xanh dương cho CTA/chọn tuyến. Không thiết kế logo, mua font hoặc tải font CDN bắt buộc. Biểu tượng từ hệ icon đi cùng components được chọn, kiểm tra license và bundle vào app shell; chưa chọn thư viện icon riêng bằng tài liệu này.

Ngôn ngữ RTL áp direction/layout phù hợp Arabic/Urdu, không đảo geometry bản đồ hoặc tọa độ. UI strings version trong repo, English offline có đầy đủ nhãn; route instructions render bằng resource key/template theo locale online, không dịch tọa độ bằng LLM. Theme baseline không thay sitemap/flows D-015 và phải kiểm tra contrast/focus trước release. Không thêm Dark mode hoặc tùy biến theme cho du khách như một feature mới.

## 4. Mã hóa backup và người giữ khóa

Đề xuất **7-Zip định dạng 7z, AES-256, bật mã hóa tên file** cho backup thủ công trên máy nhóm. Nguồn: [7z format](https://www.7-zip.org/7z.html). Không dùng ZIP legacy/ZipCrypto hoặc coi file nén không password là mã hóa.

Đề xuất **Duy giữ khóa/passphrase**, chỉ định người thực hiện backup từng lần sau; đây là đề xuất trách nhiệm cần Duy xác nhận, không tự gán việc hàng ngày cho Tú/Hạo. Khóa giữ riêng backup, không gửi trong chat/GitHub, không đưa vào command line/log hoặc script hardcoded; hướng nhập tương tác/tài khoản vận hành sẽ cụ thể hóa ở runbook. Thử decrypt/verify bằng target local tách biệt trước nghiệm thu.

Mất khóa có thể không khôi phục được backup; không lưu khóa cùng archive để tạo cảm giác có backup. Không tự tạo khóa/password hoặc yêu cầu Duy dán secret cho AI. Chỉ cài 7-Zip từ nguồn chính thức sau khi task/môi trường được phép, không thao tác mật khẩu qua browser thay người dùng.

## 5. Các việc không cần bịa kết quả để đóng Design

- Gemini model ID/region/tier/voice khả dụng phải kiểm tra bằng tài khoản thật trước task gọi provider; D-018 đã cho phép quy trình chọn stable Free tier và xác nhận cấu hình, không mặc định model mới nhất miễn phí.
- Dung lượng graph/package và quota Vercel/Render/Atlas/Cloudinary cần đo; dùng hướng đã duyệt để lập task kiểm chứng, không ghi như đã đạt.
- Hồ sơ schema/API hợp nhất cần được review nhất quán với các DEC, không tạo trường mới âm thầm. Nếu phát hiện thiếu trường/quan hệ ảnh hưởng semantics, trình patch rõ nội dung.
- Nghiệm thu routing/Safari/16 locale/backup/load thuộc gate trước release; Android waiver giữ nguyên. Không yêu cầu có app hoàn chỉnh trước khi cho lập kế hoạch Implementation, nhưng task phải có inputs/AC rõ.

## 6. Quyết định cần Duy

1. Chọn **A (JavaScript ESM/JSX/JSDoc)** hoặc **B (TypeScript)**.
2. Duyệt bộ công cụ/version policy và UI baseline ở mục 2–3, hoặc ghi package/phần muốn đổi.
3. Duyệt 7-Zip/7z AES-256 và đề xuất Duy giữ khóa backup; người chạy backup chưa gán.

Sau D-020 sẽ hợp nhất schema/API/Design dossier và trình gate Design; chưa tạo app/Issue/assignment hoặc workflow sản phẩm từ việc duyệt tài liệu này.

## Phê duyệt — DEC-080

Duy chọn A JavaScript ESM/JSX/JSDoc và duyệt phần còn lại: tooling/version policy/UI baseline, 7-Zip 7z AES-256 và Duy giữ khóa. Chưa gán người chạy backup; không tạo password hoặc cài/scaffold app từ việc duyệt này.
