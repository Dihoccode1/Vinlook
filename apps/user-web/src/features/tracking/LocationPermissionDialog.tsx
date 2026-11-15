import { NativeDialog } from '@vinlook/ui/dialog';
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
    <NativeDialog
      ref={dialog}
      className="gps-permission-dialog box-border w-[min(440px,_calc(100%_-_32px))] max-h-[calc(100dvh_-_48px)] overflow-auto p-[28px] text-[#243d33] shadow-[0_20px_80px_#153f3240] [@media(max-width:_480px)]:p-[22px]"
      aria-labelledby="gps-permission-title"
      aria-describedby="gps-permission-description"
      onCancel={(event) => {
        event.preventDefault();
        on_later();
      }}
    >
      <div
        className="gps-permission-icon grid w-[54px] h-[54px] rounded-[16px] bg-[#eaf2e4] text-vinlook-forest text-[34px]"
        aria-hidden="true"
      >
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
      <div className="gps-permission-actions flex gap-[12px] justify-end flex-wrap mt-[24px]">
        <Button variant="outline" onClick={on_later}>
          Để sau
        </Button>
        <Button className="gps-permission-allow" onClick={on_allow}>
          Cho phép định vị
        </Button>
      </div>
    </NativeDialog>
  );
}
