import { NativeDialog } from '@vinlook/ui/dialog';
import { Input } from '@vinlook/ui/input';
import { Button } from '@vinlook/ui/button';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../services/api';

interface PasswordChangeDialogProps {
  username: string;
  target_user_id?: string;
  on_close: () => void;
  on_saved: () => void;
}

export function PasswordChangeDialog({
  username,
  target_user_id,
  on_close,
  on_saved,
}: PasswordChangeDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);
  const [current_password, set_current_password] = useState('');
  const [new_password, set_new_password] = useState('');
  const [confirm_password, set_confirm_password] = useState('');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState('');

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    if (overflow !== 'hidden') document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      if (overflow !== 'hidden') document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (new_password !== confirm_password) {
      set_error('Xác nhận mật khẩu chưa khớp.');
      confirmation.current?.focus();
      return;
    }

    set_busy(true);
    set_error('');
    try {
      await api('/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password, new_password, target_user_id }),
      });
      on_saved();
    } catch (failure) {
      set_error(failure instanceof Error ? failure.message : 'Chưa đổi được mật khẩu.');
      set_busy(false);
    }
  }

  return (
    <NativeDialog
      ref={dialog}
      className="user-dialog p-[0] text-[#294532] shadow-[0_24px_90px_#12302238]"
      aria-labelledby="password-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) on_close();
      }}
    >
      <form onSubmit={save} aria-busy={busy}>
        <header className="user-dialog-header flex justify-between gap-[16px] shrink-0 items-start">
          <div>
            <h2 id="password-dialog-title">Đổi mật khẩu</h2>
            <p>
              {username} ·{' '}
              {target_user_id
                ? 'Tài khoản này sẽ cần đăng nhập lại.'
                : 'Bạn sẽ cần đăng nhập lại bằng mật khẩu mới.'}
            </p>
          </div>
          <Button
            variant="custom"
            type="button"
            className="icon-button leading-[30px]"
            aria-label="Đóng"
            onClick={on_close}
            disabled={busy}
          >
            ✕
          </Button>
        </header>

        <div className="user-dialog-body min-h-0 flex-[1]">
          <div className="form-grid grid">
            <label className="password-current-field">
              {target_user_id ? 'Mật khẩu hiện tại của bạn' : 'Mật khẩu hiện tại'}
              <Input
                appearance="custom"
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
                value={current_password}
                disabled={busy}
                onChange={(event) => set_current_password(event.target.value)}
              />
            </label>
            <label>
              Mật khẩu mới
              <Input
                appearance="custom"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={200}
                value={new_password}
                disabled={busy}
                onChange={(event) => set_new_password(event.target.value)}
              />
            </label>
            <label>
              Xác nhận mật khẩu mới
              <Input
                appearance="custom"
                ref={confirmation}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={200}
                value={confirm_password}
                disabled={busy}
                onChange={(event) => set_confirm_password(event.target.value)}
              />
            </label>
          </div>
          <p className="field-note text-[#a1a98f]">Mật khẩu mới cần ít nhất 8 ký tự.</p>
          {error && (
            <p
              className="error-banner py-[13px] px-[15px] bg-[#fff0e8] text-[#a65d40] rounded-[8px]"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="user-form-actions flex justify-end">
          <Button variant="custom" type="button" onClick={on_close} disabled={busy}>
            Hủy bỏ
          </Button>
          <Button variant="custom" type="submit" className="primary" disabled={busy}>
            {busy ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
          </Button>
        </footer>
      </form>
    </NativeDialog>
  );
}
