import { useRef } from 'react';
import { Alert } from '@vinlook/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@vinlook/ui/alert-dialog';
import { Button } from '@vinlook/ui/button';
import { cn } from '@vinlook/ui/utils';
import type { User } from '../../types';
import { Icon } from '../../components/Icon';

export function AccountStatusDialog({
  user,
  is_self,
  busy,
  error,
  on_cancel,
  on_confirm,
}: {
  user: User;
  is_self: boolean;
  busy: boolean;
  error: string;
  on_cancel: () => void;
  on_confirm: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  const locking = user.status === 'active';
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) on_cancel();
      }}
    >
      <AlertDialogContent
        aria-labelledby="account-status-title"
        aria-describedby="account-status-description"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancel.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        className="w-[min(92vw,440px)] max-w-[440px] gap-0 overflow-hidden rounded-[20px] border-[#e2e8dc] bg-[#fffefb] p-0 shadow-[0_24px_70px_#14372128]"
      >
        <div className="relative space-y-4 px-6 pt-7 pb-6">
          <Button
            variant="outline"
            size="icon"
            className="absolute top-5 right-5 h-9 w-9 rounded-full border-[#dce4d7] text-[#475d45]"
            type="button"
            aria-label="Đóng xác nhận"
            disabled={busy}
            onClick={on_cancel}
          >
            <Icon kind="close" size={18} />
          </Button>
          <span
            className={cn(
              'grid h-12 w-12 place-items-center rounded-2xl',
              locking ? 'bg-[#fbece8] text-[#b84b36]' : 'bg-[#eaf3eb] text-[#285e43]',
            )}
          >
            <svg
              width="27"
              height="27"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="10" width="14" height="11" rx="3" />
              <path d={locking ? 'M8 10V7a4 4 0 0 1 8 0v3' : 'M8 10V7a4 4 0 0 1 7.5-2'} />
              <path d="M12 14v3" />
            </svg>
          </span>
          <div>
            <span className="block text-[10px] font-semibold tracking-[1.6px] text-[#8b9a7c] uppercase">
              QUẢN LÝ TÀI KHOẢN
            </span>
            <AlertDialogTitle
              id="account-status-title"
              className="mt-1.5 text-[22px] leading-snug font-semibold text-[#173329]"
            >
              {locking
                ? is_self
                  ? 'Khóa tài khoản đang đăng nhập?'
                  : 'Khóa tài khoản này?'
                : 'Mở khóa tài khoản này?'}
            </AlertDialogTitle>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-[#e5ebe0] bg-[#f8faf5] px-4 py-3 text-sm">
            <Icon kind="user" size={19} className="shrink-0 text-[#5d775b]" />
            <strong className="font-semibold text-foreground">{user.username}</strong>
            <span className="ml-auto text-xs text-[#7c8b74]">
              {user.role === 'admin' ? 'Admin' : 'Staff'}
              {is_self ? ' · Bạn' : ''}
            </span>
          </div>
          <AlertDialogDescription
            id="account-status-description"
            className="m-0 text-[13px] leading-relaxed text-[#5c6f59]"
          >
            {locking ? (
              is_self ? (
                <>
                  <strong>Bạn sẽ bị đăng xuất ngay</strong> sau khi xác nhận khóa tài khoản đang
                  đăng nhập.
                  <br />
                  <strong>Muốn mở lại tài khoản, hãy nhờ Admin khác mở khóa.</strong> Bạn không thể
                  tự đăng nhập lại khi tài khoản còn bị khóa.
                </>
              ) : (
                'Tài khoản sẽ không thể đăng nhập. Các phiên đăng nhập hiện tại sẽ được kết thúc ngay.'
              )
            ) : (
              'Tài khoản sẽ có thể đăng nhập trở lại. Số lần nhập sai mật khẩu và thời gian chờ sẽ được đặt lại.'
            )}
          </AlertDialogDescription>
          {error && (
            <Alert variant="destructive" role="alert" className="text-xs leading-relaxed">
              {error}
            </Alert>
          )}
        </div>
        <AlertDialogFooter className="flex-row items-center justify-end gap-2.5 border-t border-[#e5ebe0] bg-[#f8faf4] px-6 py-4">
          <Button
            ref={cancel}
            type="button"
            variant="outline"
            disabled={busy}
            onClick={on_cancel}
            className="h-10 rounded-lg border-[#dce3d6] bg-white px-5 text-xs font-semibold text-[#2d473a]"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant={locking ? 'destructive' : 'default'}
            disabled={busy}
            onClick={on_confirm}
            className={cn(
              'h-10 rounded-lg px-5 text-xs font-semibold',
              locking && 'bg-[#b6462e] text-white hover:bg-[#9b3822]',
            )}
          >
            {busy ? 'Đang xử lý…' : locking ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
