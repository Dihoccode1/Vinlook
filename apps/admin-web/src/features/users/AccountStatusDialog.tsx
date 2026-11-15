import { Button } from '@vinlook/ui/button';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@vinlook/ui/alert-dialog';
import type { User } from '../../types';
import { Icon } from '../../components/Icon';
import './account-status-dialog.css';

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
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const [container] = useState(() => document.querySelector<HTMLElement>('.admin-app'));

  const locking = user.status === 'active';
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) on_cancel();
      }}
    >
      <AlertDialogContent
        container={container}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        className={`account-status-dialog ${locking ? 'confirm-lock' : 'confirm-unlock'}`}
        aria-labelledby="account-status-title"
        aria-describedby="account-status-description"
      >
        <div className="status-confirm-body relative">
          <Button
            variant="custom"
            className="status-confirm-close"
            type="button"
            aria-label="Đóng xác nhận"
            disabled={busy}
            onClick={on_cancel}
          >
            <Icon kind="close" size={18} />
          </Button>
          <span className="status-confirm-icon grid w-[54px] h-[54px] mb-[20px] rounded-[16px]">
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
          <span className="status-confirm-eyebrow block text-[9px] font-semibold tracking-[1.5px] text-[#8e9c83]">
            QUẢN LÝ TÀI KHOẢN
          </span>
          <AlertDialogTitle asChild>
            <h2 id="account-status-title">
              {locking
                ? is_self
                  ? 'Khóa tài khoản đang đăng nhập?'
                  : 'Khóa tài khoản này?'
                : 'Mở khóa tài khoản này?'}
            </h2>
          </AlertDialogTitle>
          <div className="status-confirm-user flex items-center gap-[9px] py-[13px] px-[14px] bg-[#f6f8f2] [@media(max-width:_480px)]:gap-[7px] [@media(max-width:_480px)]:p-[12px]">
            <Icon kind="user" size={19} />
            <strong>{user.username}</strong>
            <span>
              {user.role === 'admin' ? 'Admin' : 'Staff'}
              {is_self ? ' · Bạn' : ''}
            </span>
          </div>
          <AlertDialogDescription asChild>
            <p id="account-status-description">
              {locking ? (
                is_self ? (
                  <>
                    <strong>Bạn sẽ bị đăng xuất ngay</strong> sau khi xác nhận khóa tài khoản đang
                    đăng nhập.
                    <br />
                    <strong>Muốn mở lại tài khoản, hãy nhờ Admin khác mở khóa.</strong> Bạn không
                    thể tự đăng nhập lại khi tài khoản còn bị khóa.
                  </>
                ) : (
                  'Tài khoản sẽ không thể đăng nhập. Các phiên đăng nhập hiện tại sẽ được kết thúc ngay.'
                )
              ) : (
                'Tài khoản sẽ có thể đăng nhập trở lại. Số lần nhập sai mật khẩu và thời gian chờ sẽ được đặt lại.'
              )}
            </p>
          </AlertDialogDescription>
          {error && (
            <div
              className="error-banner py-[13px] px-[15px] bg-[#fff0e8] text-[#a65d40] rounded-[8px]"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
        <footer className="status-confirm-actions flex justify-end gap-[10px] py-[17px] px-[28px] bg-[#f8faf5] [@media(max-width:_480px)]:py-[15px] [@media(max-width:_480px)]:px-[20px]">
          <AlertDialogCancel asChild>
            <Button variant="custom" type="button" disabled={busy}>
              Hủy
            </Button>
          </AlertDialogCancel>
          <Button
            variant="custom"
            type="button"
            className="status-confirm-submit"
            disabled={busy}
            onClick={on_confirm}
          >
            {busy ? 'Đang xử lý…' : locking ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
          </Button>
        </footer>
      </AlertDialogContent>
    </AlertDialog>
  );
}
