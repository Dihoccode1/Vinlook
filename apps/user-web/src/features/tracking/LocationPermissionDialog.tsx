import { Button } from '@vinlook/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@vinlook/ui/dialog';

export function LocationPermissionDialog({
  on_allow,
  on_later,
}: {
  on_allow: () => void;
  on_later: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) on_later();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[min(440px,calc(100vw-2rem))] gap-0 rounded-[20px] border-border bg-white p-7 text-foreground shadow-[0_24px_60px_#142a1e26] max-[480px]:p-6"
      >
        <div
          className="mb-4 grid size-11 place-items-center rounded-xl bg-secondary text-2xl leading-none text-primary"
          aria-hidden="true"
        >
          ⌖
        </div>
        <DialogHeader className="gap-2.5">
          <DialogTitle className="text-[22px] font-semibold tracking-tight text-foreground">
            Khám phá địa điểm gần bạn
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.7] text-[#55675a]">
            Cho phép Vinlook dùng vị trí để tìm địa điểm trong bán kính 5 km và chỉ đường từ nơi bạn
            đang đứng.
          </DialogDescription>
        </DialogHeader>
        <p className="mt-2 text-xs leading-[1.7] text-muted-foreground">
          Bấm Cho phép định vị, sau đó cho phép truy cập vị trí nếu trình duyệt hỏi. Bạn vẫn có thể
          xem bản đồ và tìm kiếm khi chọn Để sau.
        </p>
        <DialogFooter className="mt-6 flex-row justify-end gap-2.5 max-[480px]:flex-col-reverse">
          <Button
            variant="outline"
            onClick={on_later}
            className="min-h-11 rounded-[10px] border-primary/25 px-4 text-[13px] font-semibold text-primary max-[480px]:w-full"
          >
            Để sau
          </Button>
          <Button
            onClick={on_allow}
            className="min-h-11 rounded-[10px] px-4 text-[13px] font-semibold max-[480px]:w-full"
          >
            Cho phép định vị
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
