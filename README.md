# Multilingual Tourism Platform

Bo khung monorepo cho web app ban do va dich noi dung POI sang it nhat 15 ngon ngu.

## Thanh phan

- apps/user-web: ban do, GPS thoi gian thuc, tim POI, chi duong va ban dich.
- apps/admin-web: quan ly user, section, POI, ngon ngu va duyet ban dich.
- apps/monitor-web: theo doi health, metrics, usage, log va canh bao.
- services/: API Gateway va 8 microservice Node.js doc lap.
- packages/: contracts, logging, telemetry, auth va UI dung chung.
- infrastructure/: Docker, Kubernetes, SQL Server, Redis, RabbitMQ va observability.
- .github/: vi tri workflow CI/CD va composite action.
- tests/: kiem thu e2e, contract va load.
- docs/: tai lieu kien truc, API, database, event va xu ly su co.

## Quy uoc

Moi service so huu database SQL Server rieng; khong truy van truc tiep database cua service khac.
Migration va seed nam trong tung service. Gateway khong so huu database nghiep vu.
GPS moi nhat co the cache tren Redis; lich su chi luu khi can.
Dich duoc xu ly bat dong bo qua RabbitMQ, co version noi dung nguon.
Khong dua toa do GPS, token hay thong tin nhay cam vao log.

## Trang thai

Day la cau truc thu muc, chua phai ung dung chay duoc.
Chua cai dependency, chua co server, Dockerfile hay pipeline CI/CD thuc thi.
Cac thu muc rong duoc giu trong Git bang .gitkeep.
Chon mot package manager cho ca repo; pnpm-workspace.yaml da duoc chuan bi neu dung pnpm.