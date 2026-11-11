import { useEffect, useRef } from 'react';
import { Button } from '@vinlook/ui/button';

export function LocationPermissionDialog({
  on_allow,
  on_later,
}: {
  on_allow: () => void;
  on_later: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="gps-permission-dialog"
      aria-labelledby="gps-permission-title"
      aria-describedby="gps-permission-description"
      onCancel={(event) => {
        event.preventDefault();
        on_later();
      }}
    >
      <div className="gps-permission-icon" aria-hidden="true">
        ⌖
      </div>
      <h2 id="gps-permission-title">Khám phá địa điểm gần bạn</h2>
      <p id="gps-permission-description">
        Cho phép Vinlook dùng vị trí để tìm địa điểm trong bán kính 5 km và chỉ đường từ nơi bạn
        đang đứng.
      </p>
      <p className="gps-permission-hint">
        Bấm Cho phép định vị, sau đó cho phép truy cập vị trí nếu trình duyệt hỏi. Bạn vẫn có thể
        xem bản đồ và tìm kiếm khi chọn Để sau.
      </p>
      <div className="gps-permission-actions">
        <Button variant="outline" onClick={on_later}>
          Để sau
        </Button>
        <Button className="gps-permission-allow" onClick={on_allow}>
          Cho phép định vị
        </Button>
      </div>
    </dialog>
  );
}
