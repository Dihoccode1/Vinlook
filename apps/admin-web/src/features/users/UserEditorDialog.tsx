import { Alert } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { cn } from '@vinlook/ui/utils';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@vinlook/ui/dialog';
import { Input } from '@vinlook/ui/input';
import { Select } from '@vinlook/ui/select';
import type { User } from '../../types';

import type { useUserManagement } from './useUserManagement';
type Props = Pick<
  ReturnType<typeof useUserManagement>,
  | 'current_user_id'
  | 'error'
  | 'set_error'
  | 'notice'
  | 'editing'
  | 'form'
  | 'set_form'
  | 'busy'
  | 'confirm_password'
  | 'set_confirm_password'
  | 'set_username_check'
  | 'set_password_target'
  | 'confirm_input'
  | 'username_state'
  | 'username_blocked'
  | 'close_editor'
  | 'save'
  | 'username_messages'
>;

const USERNAME_STATUS_CLASS: Record<string, string> = {
  available: 'text-[#487650]',
  invalid: 'text-[#a53f32]',
  taken: 'text-[#a53f32]',
  checking: 'text-[#6c826e]',
  unavailable: 'text-[#8c7050]',
  idle: 'text-[#7c8b74]',
};

export function UserEditorDialog({
  current_user_id,
  error,
  set_error,
  notice,
  editing,
  form,
  set_form,
  busy,
  confirm_password,
  set_confirm_password,
  set_username_check,
  set_password_target,
  confirm_input,
  username_state,
  username_blocked,
  close_editor,
  save,
  username_messages,
}: Props) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close_editor();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-labelledby="user-dialog-title"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        className="w-[min(94vw,560px)] max-w-[560px] gap-0 overflow-hidden rounded-[20px] border-[#e2e8dc] bg-[#fffefb] p-0 shadow-[0_24px_70px_#14372128]"
      >
        <form onSubmit={save} className="grid max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)_auto]">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e5ebe0] px-6 py-5">
            <div className="min-w-0">
              <DialogTitle id="user-dialog-title" className="text-lg font-semibold text-[#173329]">
                {editing ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[#7c8b74]">
                {editing
                  ? 'Cập nhật thông tin và quyền hạn truy cập dashboard.'
                  : 'Thêm thành viên mới vào không gian điều hành Vinlook.'}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-[10px] border-[#dce4d7] text-[#385344]"
              type="button"
              aria-label="Đóng cửa sổ tài khoản"
              disabled={busy}
              onClick={close_editor}
            >
              ✕
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={editing === null ? 'sm:col-span-2' : undefined}>
                <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
                  <span>Tên tài khoản</span>
                  <Input
                    required
                    pattern="[a-zA-Z0-9_.\-]{3,100}"
                    minLength={3}
                    maxLength={100}
                    autoComplete="off"
                    autoFocus={!editing}
                    value={form.username}
                    disabled={busy || !!editing}
                    aria-describedby={editing === null ? 'username-availability' : undefined}
                    aria-invalid={username_state === 'invalid' || username_state === 'taken'}
                    onChange={(e) => {
                      set_form({ ...form, username: e.target.value });
                      set_username_check(null);
                      set_error('');
                    }}
                    className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                  />
                </label>
                {editing === null && (
                  <p
                    id="username-availability"
                    className={cn(
                      'mt-1.5 mb-0 text-[11px] leading-relaxed',
                      USERNAME_STATUS_CLASS[username_state] ?? 'text-[#7c8b74]',
                    )}
                    data-state={username_state}
                    role="status"
                  >
                    {username_messages[username_state]}
                  </p>
                )}
              </div>

              {editing && (
                <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
                  <span>Họ và tên</span>
                  <Input
                    required
                    maxLength={200}
                    autoFocus
                    value={form.full_name}
                    disabled={busy}
                    onChange={(e) => set_form({ ...form, full_name: e.target.value })}
                    className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                  />
                </label>
              )}

              {!editing && (
                <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
                    <span>Mật khẩu</span>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={5}
                      maxLength={200}
                      value={form.password}
                      disabled={busy}
                      onChange={(e) => {
                        set_form({ ...form, password: e.target.value });
                        set_confirm_password('');
                        set_error('');
                      }}
                      className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
                    <span>Xác nhận mật khẩu</span>
                    <Input
                      ref={confirm_input}
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={5}
                      maxLength={200}
                      value={confirm_password}
                      disabled={busy}
                      onChange={(e) => {
                        set_confirm_password(e.target.value);
                        set_error('');
                      }}
                      className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                    />
                  </label>
                </div>
              )}

              <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
                <span>Quyền hạn</span>
                <Select
                  value={form.role}
                  disabled={busy || editing?.id.toLowerCase() === current_user_id.toLowerCase()}
                  onChange={(e) => set_form({ ...form, role: e.target.value as User['role'] })}
                  className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                >
                  <option value="staff">Staff (Nhân viên)</option>
                  <option value="admin">Admin (Quản trị viên)</option>
                </Select>
              </label>

              <label className="grid gap-1.5 text-xs font-medium text-[#475d45]">
                <span>Trạng thái</span>
                <Select
                  value={form.status}
                  disabled={busy || editing?.username.toLowerCase() === 'admin'}
                  onChange={(e) => set_form({ ...form, status: e.target.value as User['status'] })}
                  className="h-10 rounded-[9px] border-[#d6e0d2] bg-white text-base md:text-[13px]"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="disabled">Đã khóa</option>
                </Select>
              </label>
            </div>

            {error && (
              <Alert variant="destructive" role="alert" className="text-xs leading-relaxed">
                {error}
              </Alert>
            )}
            {notice && (
              <Alert variant="success" role="status" className="text-xs leading-relaxed">
                {notice}
              </Alert>
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#e5ebe0] bg-[#fffefb] px-6 py-4">
            {editing && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => set_password_target(editing)}
                className="mr-auto h-10 rounded-lg border-[#dce3d6] px-4 text-xs font-medium text-[#475d45]"
              >
                Đổi mật khẩu
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close_editor}
              className="h-10 rounded-lg border-[#dce3d6] px-4 text-xs font-medium text-[#475d45]"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={busy || username_blocked}
              className="h-10 rounded-lg px-4 text-xs font-semibold"
            >
              {busy ? 'Đang lưu...' : 'Lưu tài khoản'}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
