import { useRef, useState, type FormEvent } from 'react';
import { Alert } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@vinlook/ui/dialog';
import { Input } from '@vinlook/ui/input';
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
  const confirmation = useRef<HTMLInputElement>(null);
  const [current_password, set_current_password] = useState('');
  const [new_password, set_new_password] = useState('');
  const [confirm_password, set_confirm_password] = useState('');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState('');

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) on_close();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-labelledby="password-dialog-title"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        className="w-[min(94vw,520px)] max-w-[520px] gap-0 overflow-hidden rounded-[20px] border-[#e2e8dc] bg-[#fffefb] p-0 shadow-[0_24px_70px_#14372128]"
      >
        <form
          onSubmit={save}
          aria-busy={busy}
          className="grid max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)_auto]"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e5ebe0] px-6 py-5">
            <div>
              <DialogTitle
                id="password-dialog-title"
                className="text-lg font-semibold text-[#173329]"
              >
                Đổi mật khẩu
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[#7c8b74]">
                {username} ·{' '}
                {target_user_id
                  ? 'Tài khoản này sẽ cần đăng nhập lại.'
                  : 'Bạn sẽ cần đăng nhập lại bằng mật khẩu mới.'}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-[10px] border-[#dce4d7] text-[#385344]"
              aria-label="Đóng"
              onClick={on_close}
              disabled={busy}
            >
              ✕
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium text-[#475d45] sm:col-span-2">
                <span>{target_user_id ? 'Mật khẩu hiện tại của bạn' : 'Mật khẩu hiện tại'}</span>
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={200}
                  value={current_password}
                  disabled={busy}
                  onChange={(event) => set_current_password(event.target.value)}
                  className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
                <span>Mật khẩu mới</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                  value={new_password}
                  disabled={busy}
                  onChange={(event) => set_new_password(event.target.value)}
                  className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
                <span>Xác nhận mật khẩu mới</span>
                <Input
                  ref={confirmation}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                  value={confirm_password}
                  disabled={busy}
                  onChange={(event) => set_confirm_password(event.target.value)}
                  className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                />
              </label>
            </div>
            <p className="m-0 text-[11px] text-[#82917b]">Mật khẩu mới cần ít nhất 8 ký tự.</p>
            {error && (
              <Alert variant="destructive" role="alert" className="text-xs leading-relaxed">
                {error}
              </Alert>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2.5 border-t border-[#e5ebe0] bg-[#fffefb] px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={on_close}
              disabled={busy}
              className="h-10 rounded-lg border-[#dce3d6] px-4 text-xs font-medium text-[#475d45]"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="h-10 rounded-lg px-4 text-xs font-semibold"
            >
              {busy ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
