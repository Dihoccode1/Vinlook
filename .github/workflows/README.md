# CI/CD

`ci-cd.yml` kiểm tra PR và push `main`/`TEST`: format, typecheck, test, production build, SQL integration và Docker build.

Push/merge vào `main` sau khi kiểm tra đạt sẽ triển khai Docker trên runner Windows, kiểm tra backend, stage và promote ba frontend trên Vercel. PR không chạy trên runner triển khai. Xem [hướng dẫn cấu hình và vận hành](../../docs/deployment.md).
