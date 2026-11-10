# CI/CD

Workflow `pull-request.yml` chạy kiểm tra tự động trên Pull Request và khi push nhánh `TEST`:
- Kiểm tra kiểu tĩnh (`npm run typecheck`), kiểm thử đơn vị (`npm test`) và đóng gói sản phẩm (`npm run build`) trên toàn bộ 6 workspace.
- Kiểm thử tích hợp SQL Server (`PoiDb` & `TranslationDb`): chạy migration và seed hai lần liên tiếp để xác minh tính lũy đẳng (idempotency) và kiểm tra toàn bộ truy vấn repository trên cơ sở dữ liệu thật.
