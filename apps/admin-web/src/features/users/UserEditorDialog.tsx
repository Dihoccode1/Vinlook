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
  | 'dialog'
  | 'username_state'
  | 'username_blocked'
  | 'close_editor'
  | 'save'
  | 'username_messages'
>;
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
  dialog,
  username_state,
  username_blocked,
  close_editor,
  save,
  username_messages,
}: Props) {
  return (
    <>
      <dialog ref={dialog} className="user-dialog" aria-labelledby="user-dialog-title">
        <form onSubmit={save}>
          <header className="user-dialog-header">
            <div>
              <h2 id="user-dialog-title">
                {editing ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
              </h2>
              <p>
                {editing
                  ? 'Cập nhật thông tin và quyền hạn truy cập dashboard.'
                  : 'Thêm thành viên mới vào không gian điều hành Vinlook.'}
              </p>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Đóng cửa sổ tài khoản"
              disabled={busy}
              onClick={close_editor}
            >
              ✕
            </button>
          </header>

          <div className="user-dialog-body">
            <div className="form-grid">
              <div className={editing === null ? 'account-username-wide' : undefined}>
                <label>
                  Tên tài khoản
                  <input
                    required
                    pattern="[a-zA-Z0-9_.\-]{3,100}"
                    minLength={3}
                    maxLength={100}
                    autoComplete="off"
                    value={form.username}
                    disabled={busy || !!editing}
                    aria-describedby={editing === null ? 'username-availability' : undefined}
                    aria-invalid={username_state === 'invalid' || username_state === 'taken'}
                    onChange={(e) => {
                      set_form({ ...form, username: e.target.value });
                      set_username_check(null);
                      set_error('');
                    }}
                  />
                </label>
                {editing === null && (
                  <p
                    id="username-availability"
                    className="username-availability"
                    data-state={username_state}
                    role="status"
                  >
                    {username_messages[username_state]}
                  </p>
                )}
              </div>

              {editing && (
                <label>
                  Họ và tên
                  <input
                    required
                    maxLength={200}
                    value={form.full_name}
                    disabled={busy}
                    onChange={(e) => set_form({ ...form, full_name: e.target.value })}
                  />
                </label>
              )}

              {!editing && (
                <div className="password-pair form-grid">
                  <label>
                    Mật khẩu
                    <input
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
                    />
                  </label>

                  <label>
                    Xác nhận mật khẩu
                    <input
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
                    />
                  </label>
                </div>
              )}

              <label>
                Quyền hạn
                <select
                  value={form.role}
                  disabled={busy || editing?.id.toLowerCase() === current_user_id.toLowerCase()}
                  onChange={(e) => set_form({ ...form, role: e.target.value as User['role'] })}
                >
                  <option value="staff">Staff (Nhân viên)</option>
                  <option value="admin">Admin (Quản trị viên)</option>
                </select>
              </label>

              <label>
                Trạng thái
                <select
                  value={form.status}
                  disabled={busy || editing?.username.toLowerCase() === 'admin'}
                  onChange={(e) => set_form({ ...form, status: e.target.value as User['status'] })}
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="disabled">Đã khóa</option>
                </select>
              </label>
            </div>

            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="notice-banner" role="status">
                {notice}
              </div>
            )}
          </div>

          <footer
            className={editing ? 'user-form-actions account-edit-actions' : 'user-form-actions'}
          >
            {editing && (
              <button type="button" disabled={busy} onClick={() => set_password_target(editing)}>
                Đổi mật khẩu
              </button>
            )}
            <button type="button" disabled={busy} onClick={close_editor}>
              Hủy bỏ
            </button>
            <button className="primary" disabled={busy || username_blocked}>
              {busy ? 'Đang lưu...' : 'Lưu tài khoản'}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
