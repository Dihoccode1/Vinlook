# CI/CD

pull-request.yml chạy kiểm tra trên PR và khi push nhánh TEST:
- Typecheck, API unit tests và production build.
- SQL Server integration: migrate/seed hai lần và kiểm tra repository trên database riêng.

Chưa có pipeline publish image hay deploy. Các action folder khác đang là bộ khung.
