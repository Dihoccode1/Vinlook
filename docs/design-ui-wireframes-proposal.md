# Vinlook — D-015: wireframe và trạng thái màn hình

Ngày 23/10/2026. **ĐÃ DUYỆT tại DEC-075**. Wireframe cấu trúc, chưa chốt màu/font/ảnh cuối và chưa tạo UI ứng dụng. Nội dung label minh họa bằng English theo yêu cầu; online du khách dùng danh mục 16 ngôn ngữ, admin/monitoring English. Offline English theo baseline.

## 1. Du khách — màn hình chính mobile

```text
┌──────────────────────────────────┐
│ Vinlook            Language ▾    │
│ Search places…                   │
│ [Offline / GPS status if needed] │
│                                  │
│             MAP                  │
│   POI markers        [Locate me] │
│                                  │
│ Nearby places · within 3 km       │
│ Place A                 0.8 km  > │
│ Place B                 1.2 km  > │
│ [Map]                 [Offline]  │
└──────────────────────────────────┘
```

Đề xuất bottom navigation chỉ Map/Offline. Search và nearby chọn **một POI**, không thêm itinerary. Nearby tối đa 4, chỉ số thật; nhãn khoảng cách là đường thẳng, không giả walking distance. Không có GPS vẫn map/search/POI/audio/download, nearby cần vị trí thì giải thích và nút Enable location, không chặn toàn app.

Search kết quả danh sách dưới ô tìm, chọn mở POI sheet và focus marker; no-results hiển thị rõ và cho sửa query. Không tự mở chỉ đường chỉ vì chạm marker. Màn hình tải/error có Retry thay spinner vô hạn. Đề xuất địa chỉ nhân viên `/staff/login` được truy cập riêng, không yêu cầu du khách đăng nhập.

## 2. POI sheet và audio

```text
┌──────────────────────────────────┐
│ [Thumbnail]                 [×] │
│ Place name                       │
│ Narration language: English ▾    │
│ Description…                     │
│ [Play / Pause]    00:00 / 02:00   │
│ [Start walking]                  │
└──────────────────────────────────┘
```

Đề xuất một audio active trong tab; Play POI khác dừng lượt cũ rồi tạo lượt mới, không phát chồng. Pause giữ lượt nghe theo yêu cầu. Đóng sheet **không tự dừng audio**: đề xuất mini-player trên map có tên POI, Play/Pause, Close; Close kết thúc lượt phát. Đây là quyết định lifecycle mới cần duyệt.

Offline chuyển UI/text English, dừng non-English audio và yêu cầu Play English như baseline. Không tự phát khi tới POI, đổi ngôn ngữ hoặc mở sheet. Audio lỗi hiển thị Retry; text vẫn đọc được. Không tự tải cả gói chỉ vì Play lỗi mạng.

## 3. Điều hướng foreground

```text
┌──────────────────────────────────┐
│ Walking to Place A        [Stop] │
│ Next instruction / GPS status    │
│                                  │
│ MAP + route + current location   │
│                                  │
│ Distance · [View steps]           │
│ Recalculating… / Arrived         │
└──────────────────────────────────┘
```

View steps là danh sách chữ/hình; không thêm giọng đọc chỉ đường. Không hiển thị ETA trước khi có mô hình tốc độ được duyệt. GPS kém/mất giữ tuyến và thông báo, không giả vị trí còn cập nhật. No-route/snap failure có Retry/Choose another place. Stop hủy đúng navigation theo D-012. Đích bị xóa đã sync dừng và giải thích; gói mới không làm reload giữa tuyến.

## 4. Offline screen

```text
┌──────────────────────────────────┐
│ Offline                          │
│ Ho Chi Minh City · English        │
│ Package version · Total size      │
│ Available storage estimate        │
│ [Download / Update / Retry]       │
│ Progress: files verified / total  │
│ Status: Ready / Incomplete        │
│ [Map]                 [Offline]  │
└──────────────────────────────────┘
```

Trước tải hiển thị dung lượng thật từ manifest và phần cần khi giữ gói cũ/mới; chưa đặt con số MB cố định trong UI. Ready chỉ khi các phần bắt buộc kiểm tra thành công. Lỗi quota/checksum/network nêu lý do, Retry dùng phần đã xác minh. Giữ gói đang active khi update lỗi. Chưa thêm nút xóa gói offline hoặc tự cập nhật khi người dùng chưa yêu cầu.

## 5. Nhân viên — sitemap đề xuất

```text
/staff/login · /staff/register · /staff/reset-password
/staff/pois → POI detail → draft editor → language review → submit
/staff/jobs → job detail → retry
/staff/work-session → open/reopen/close → audit history
/staff/monitoring → current counts / service & job status
/staff/accounts → pending approvals / lock / unlock / issue recovery code
```

Staff/Manager dùng chung giao diện, quyền quyết định ở server. Accounts actions chỉ Manager; không chỉ ẩn nút rồi bỏ kiểm tra backend. Setup/recovery Manager qua operator không có trang public theo D-014. Không thêm hồ sơ du khách, checkout, chat hoặc email tự động.

Đăng ký gồm Full name, Email, Password, Confirm password; sau gửi hiển thị Pending approval, không vào quyền Staff. Đăng nhập email/password, thông báo generic khi sai, 429 có thời gian thử lại; không tiết lộ credential. Reload/hết JWT yêu cầu đăng nhập lại và không tạo work session mới tự động.

## 6. Admin wireframe

```text
┌─────────────────────────────────────────────────────────┐
│ Vinlook Staff | Daily session: Closed [Open] | Account   │
├──────────────┬──────────────────────────────────────────┤
│ POIs         │ Search · status filter · [Create POI]    │
│ Jobs         │ Name | Draft | Published | Action       │
│ Work session │                                          │
│ Monitoring   │ Draft: metadata / English / languages    │
│ Accounts (*) │ [Save] [Process] [Submit]                │
└──────────────┴──────────────────────────────────────────┘
```

Trên mobile sidebar thu vào menu, danh sách thành card, editor một cột. Không bắt kéo ngang bảng để thực hiện thao tác chính. Header phiên luôn có trạng thái open/closed; nội dung read-only khi chưa mở phiên và có nút Open, không tự mở phiên khi click Save.

Editor hiển thị marker location và entrance riêng, thumbnail, English source, danh sách 16 ngôn ngữ với text/audio/version/review/job status. Có thể lưu draft chưa đủ publish. Review nghe đúng audio đang duyệt, status stale/pending/approved/changes_required không chỉ dùng màu.

Conflict 409: giữ bản nhập tại màn hình, báo bản server đã thay đổi và yêu cầu tải lại; không tự ghi đè/merge. **Đề xuất cảnh báo trước khi rời editor có thay đổi chưa lưu**, không lưu bản nháp mật khẩu/token vào browser storage. Không cam kết giữ nội dung qua reload hoặc hết phiên đăng nhập.

In_review read-only; Manager có Return to draft/Publish, được duyệt chính bản sửa của mình. Publish thiếu điều kiện hiển thị từng ngôn ngữ/asset/version chưa hợp lệ. Delete/Restore là hành động có xác nhận giải thích soft delete/restore thành draft; không có Hard delete.

## 7. Monitoring

Cards: Online visitors, Current listeners, Last refreshed; dependency states và jobs pending/running/failed/waiting_quota. Update 30 giây. API lỗi hiển thị dữ liệu cũ kèm timestamp và stale/unavailable, **không đổi thành 0**. Không có bản đồ theo dõi cá nhân hoặc lịch sử GPS. Không chạy health polling giữ services thức khi dashboard đã đóng.

## 8. Trạng thái tối thiểu để review UI

| Nhóm | Bắt buộc thể hiện |
|---|---|
| Du khách | Loading, empty, network error, offline ready/incomplete, GPS denied/uncertain/lost, no route, audio error, arrived |
| Staff | Pending approval, locked, expired login, session closed, save conflict, in_review read-only, stale media, quota/worker unavailable |
| Manager | Publish invalid/valid, delete confirm, restore draft, account approvals/recovery states |
| Monitoring | Fresh, stale, dependency unavailable, no current users có dữ liệu xác nhận |

Đề xuất labels rõ, focus bàn phím, trạng thái không phụ thuộc màu và control dễ chạm; tiêu chuẩn/định lượng accessibility sẽ chỉ rõ trong Test Plan, không tuyên bố đã đạt chứng nhận.

## 9. Nội dung cần duyệt

1. Sitemap, bố cục và screen states trên làm cơ sở thiết kế UI chi tiết.
2. Audio một lượt/tab; đóng sheet tiếp tục bằng mini-player, Close mini-player hoặc Play POI khác kết thúc lượt cũ.
3. Cảnh báo rời editor chưa lưu, giữ bản nhập tại màn hình khi conflict, không tự merge hay hứa giữ qua reload.

Không mở gate Implementation, không thay scope/offline/languages hoặc tự thêm tính năng tài khoản du khách. Chưa chốt màu/font/ảnh, UI mockup cuối hoặc Test Plan.

## Phê duyệt — DEC-075

Duy duyệt toàn bộ D-015: sitemap/wireframes/states, một audio mỗi tab và mini-player lifecycle, cảnh báo unsaved/conflict không tự merge. Màu/font/ảnh cuối và Test Plan chưa chốt; không mở Implementation.
