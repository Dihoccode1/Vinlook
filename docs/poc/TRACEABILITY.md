# PoC traceability — không sửa baseline

Đọc bản đầy đủ tại mốc seed: PRD v1.1 (`docs/PRD.md`, DEC044–046 + addenda), User Stories v1.1 US001–036, Use Cases UC001–037 DEC048, UCD001–005 DEC050, `docs/design-readiness.md` DEC081. Tên file chứa proposal không đồng nghĩa chưa duyệt: đọc phần approval và decision mới nhất; ví dụ D017 DEC077, D011 DEC071. Registry/runtime/TASK contracts mới hơn thay ứng viên Azure cũ; Azure đã bỏ, không setup lại. Không lấy đoạn lịch sử pending làm trạng thái hiện tại.

| PoC bắt buộc | Requirement/story | Use case/view | Thiết kế/implementation cần đọc |
|---|---|---|---|
| mobile/laptop,map15POI,GPS/search/nearby | REQ001–003,014;US001–004,014 | UC001–005,UCD001 | D015 wireframes; public lifecycle TASK014; locale TASK020 |
| đi bộ foreground/no-route/GPS/reroute | REQ004–006;US005–006 | UC006,UCD001 | D010 hướng đã được D011/DEC071 chốt; D011 config,D012 navigation; routing-spike source/tests, không copy bằng chứng thành product |
| offline/reopen/English/update/deletion | REQ007–009;US007–009 | UC007–010,UCD001 | D009 package,D011/012,D017 tombstone; giữ phạm vi HCMC hiện tại gồm vùng sáp nhập/Côn Đảo |
| 16locale text/audio thật90–150s/Play | REQ010–013;US010–013 | UC010–016,UCD001/002 | hybrid-v1.json,TASK016–019/020,PR62–69; validated locale pt-PT/zh-Hant/pcm/ar-EG; media/readiness gate |
| Admin A/session/RBAC/persist | REQ011–012,014,016–019,021;US011–014,018,022 | UC012–016,020,024–025,UCD002/003 | TASK005–013/015/019; D015. Staff không publish; token memory; review backend; version409 giữ input |
| presence/listener/global/byPOI | REQ022–023,025;US027–028,030 | UC030–031,UCD004 | D004/005/006/017; UUID browser nhiều tab=1,30s heartbeat/refresh,90s expiry,Pause vẫn đếm |
| health/job status/error/freshness | REQ021,024;US026,029 | UC032,UCD004 | D017 sampling; không hiển thị0/success khi dependency lỗi, không ping né sleep |
| public free deployment/CI/load/security | REQ026–032;US031–036 | UC033–037,UCD005 | D008 deployment,D014 backup,D019 test plan; giữ secrets riêng mỗi service |

## Quyết định mới của PoC

26October2026: Duy chốt Admin A; PoC phải đủ dẫn đường/offline và15POI. Đây là phạm vi nghiệm thu PoC riêng, không sửa PRD/backlog gốc. Map frontend public cần dữ liệu đã publish; không dùng admin/draft endpoint để lách cổng16locale.13locale còn lại/POI001 và14POI khác chưa có acceptance. Cần người có khả năng đánh giá ngôn ngữ; không coi AI dịch/đúng thời lượng là human review.
