# Khung khám phá trên điện thoại

Áp dụng cho viewport rộng tối đa 760px. Bản đồ phủ toàn màn hình; bảng khám phá/lộ trình nằm phía dưới.

- Mặc định thu gọn còn 25dvh; kéo thanh nắm lên mở 100dvh, kéo xuống thu về 25dvh.
- Kéo ở thanh nắm; sau khi thả tay, khung dừng tại một trong hai mức. Khi mở toàn màn hình, tìm kiếm/bộ lọc đứng yên; chỉ danh sách POI cuộn. Tab lộ trình có vùng cuộn riêng.
- Bấm thanh nắm cũng đổi mức. Có aria-expanded, hỗ trợ Enter/Space, mũi tên lên/xuống, Home/End.
- Focus tìm kiếm hoặc chọn tab sẽ mở bảng. Chọn POI, tìm vị trí hoặc yêu cầu chỉ đường sẽ thu bảng để xem bản đồ.
- Chi tiết POI, chú giải tuyến, nút zoom và attribution được đặt trên mép khung. Bản đồ có ResizeObserver khi thay đổi viewport.
- Giao diện desktop giữ sidebar bên trái; không bật kéo trên desktop. Tôn trọng prefers-reduced-motion.

Kiểm tra bằng JSDOM trong `apps/user-web/tests/mobile-sheet.test.ts` và thao tác thực tế tại viewport 390×844. Không thay đổi dữ liệu POI hay API.
