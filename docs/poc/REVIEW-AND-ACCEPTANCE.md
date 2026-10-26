# Duy review, merge và nghiệm thu

## Khi nào merge từng PR?

Duy không cần đợi cả Tú/Hạo hoàn tất tất cả task. Review từng PR nhỏ khi: base đúng codex/poc-demo; scope đúng Issue/ownership; baseline/contracts đã chốt; không secrets/mocks production; test liên quan xanh trên đúng head SHA; có hướng dẫn reproduce và evidence; không unresolved blocking comments. Backend có HTTP/disposable DB tests và UI có fixture/browser tests có thể merge độc lập. Các ô live chưa đạt phải để trống và issue chưa Done.

Với PR interface/lock/CI dùng chung: Duy xem tác động cả hai lane trước merge. Migration/env/live thay đổi phải có plan/backup/rollback, chưa chạy production chỉ vì PR được merge. Duy là người quyết định merge; không AI, Tú hoặc Hạo tự merge.

Trình tự trên GitHub: mở PR → kiểm base/head/Files changed/checks → reproduce test → ghi review Approve hoặc Request changes → khi đủ gate bấm Merge vào codex/poc-demo → fetch/retest merged SHA → comment merge SHA vào Issue. Nhánh task không tự xóa nếu còn cần điều tra. Không merge main, không bật auto-merge, không force shared branch. `Refs` không tự đóng issue; Duy đóng PoC Issue khi AC của task đã nghiệm thu, không đóng TASK gốc.

CI mới phải trigger pull_request với base codex/poc-demo và push branchPoC khi cần; không dùng workflow filter chỉ main rồi gọi không có check là xanh. Workflow chỉ read permissions, pinned official actions, không đọc production secrets vào PR không tin cậy.

## Task DoD chung (tick trong từng Issue)

- [ ] Đã đọc baseline/traceability và ghi status bắt đầu.
- [ ] Code đúng scope, contracts không thiếu quyết định chặn.
- [ ] Kiểm thử module/lỗi/phân quyền có kết quả và exact SHA.
- [ ] Không secret, không fixture trong production; không giả evidence.
- [ ] PR base codex/poc-demo, Dihoccode1 được yêu cầu review; hướng dẫn handoff đầy đủ.
- [ ] Duy review, yêu cầu sửa đã giải quyết; CI xanh trên head cuối.
- [ ] Duy merge; ghi merge SHA và retest tích hợp liên quan.
- [ ] Live AC của task (nếu có) đạt, Duy chấp nhận rồi đóng tay Issue.

## Checklist nghiệm thu toàn PoC — không tick bằng dự đoán

- [ ]15POI nguồn/tọa độ/entrance/ảnh thật có provenance/license; trường hợp chưa kiểm chứng được nêu đúng disposition.
- [ ]240cặp đạt nội dung/audio/model/version/thời lượng và humanreview theo cổng public; ít nhất một POI nghe lần lượt đủ16locale trên deploy. Không dùng chung file kháclocale.
- [ ] Public map/search/nearby/GPS hoạt động mobile+laptop; refusedGPS không phá xem/nghe online.
- [ ] Đi bộ thật/tính lại/mấtGPS/no-route/arrival theo D011/012, coverage đúng HCMC hiện tại; không giả tuyến.
- Offline download/package/service worker/reopen/update không thuộc nghiệm thu PoC theo quyết định Duy ngày26/10/2026. Mất mạng phải báo lỗi trung thực; không hứa khả năng dùng offline.
- [ ] Admin A thao tác thật/persist: login/session/create-edit/upload/Process/job/review/submit/return/publish;409 giữinput,401/403 đúng; public không thấy draft.
- [ ] Visitor không login; JWT staff chỉ memory; Staff không publish; không có quyền không mở Admin/Monitor/API.
- [ ] Monitor real multi-device/multitab: cùngbrowser một,hai thiết bị chungIP riêng;Play/Pause/Resume/ended/close/replaced;90s stale/mấtmạng;global+perPOI đúng,refresh30s/asOf/errors.
- [ ] HTTPS/CORSexact/frontendpublicorigins,Identity/Content/Usage riêng; khôngsecretfrontend/log/Git;Free/caps/coldstart rõ; khôngping né sleep.
- [ ] Đo concurrency tới50khách theo kế hoạch Duy duyệt, p95 theo PRD; ghi warm/cold/network/device, không nói chịu50nếu chưa đo.
- [ ] Backup/rollback và restore evidence theo baseline; deployment exact reviewed SHA qua checks/gates.
- [ ] URL public và handoff Admin qua kênhriêng; scriptdemo5–7phút, dựphòng bằng recording/lastverifiedbuild cónhãn (không thay liveAC).
- [ ] Duy kýacceptance với evidence index; PoC khác MVPfull và chưa tự cập nhật baselinebacklog.

## Khi chưa đạt hạn hai ngày

Mỗi lane báo danh sách thiếu/owner/ước lượng/rủiro và evidence, không tick Done. Duy quyết định thêm thời gian hoặc thay scope bằng CR rõ ràng; không tự thay tiêu chí. Quay lại tiến độ gốc chỉ sau tin nhắn chính xác `quy lại tiến độ`.
