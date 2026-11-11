import { useEffect, useRef } from 'react';
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
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const locking = user.status === 'active';
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    cancel.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`account-status-dialog ${locking ? 'confirm-lock' : 'confirm-unlock'}`}
      aria-labelledby="account-status-title"
      aria-describedby="account-status-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) on_cancel();
      }}
    >
      <div className="status-confirm-body">
        <button
          className="status-confirm-close"
          type="button"
          aria-label="Đóng xác nhận"
          disabled={busy}
          onClick={on_cancel}
        >
          <Icon kind="close" size={18} />
        </button>
        <span className="status-confirm-icon">
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
        <span className="status-confirm-eyebrow">QUẢN LÝ TÀI KHOẢN</span>
        <h2 id="account-status-title">
          {locking
            ? is_self
              ? 'Khóa tài khoản đang đăng nhập?'
              : 'Khóa tài khoản này?'
            : 'Mở khóa tài khoản này?'}
        </h2>
        <div className="status-confirm-user">
          <Icon kind="user" size={19} />
          <strong>{user.username}</strong>
          <span>
            {user.role === 'admin' ? 'Admin' : 'Staff'}
            {is_self ? ' · Bạn' : ''}
          </span>
        </div>
        <p id="account-status-description">
          {locking ? (
            is_self ? (
              <>
                <strong>Bạn sẽ bị đăng xuất ngay</strong> sau khi xác nhận khóa tài khoản đang đăng
                nhập.
                <br />
                <strong>Muốn mở lại tài khoản, hãy nhờ Admin khác mở khóa.</strong> Bạn không thể tự
                đăng nhập lại khi tài khoản còn bị khóa.
              </>
            ) : (
              'Tài khoản sẽ không thể đăng nhập. Các phiên đăng nhập hiện tại sẽ được kết thúc ngay.'
            )
          ) : (
            'Tài khoản sẽ có thể đăng nhập trở lại. Số lần nhập sai mật khẩu và thời gian chờ sẽ được đặt lại.'
          )}
        </p>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
      </div>
      <footer className="status-confirm-actions">
        <button ref={cancel} type="button" disabled={busy} onClick={on_cancel}>
          Hủy
        </button>
        <button
          type="button"
          className="status-confirm-submit"
          disabled={busy}
          onClick={on_confirm}
        >
          {busy ? 'Đang xử lý…' : locking ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
        </button>
      </footer>
    </dialog>
  );
}
