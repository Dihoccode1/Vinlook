import { UserTable } from './UserTable';
import { UserEditorDialog } from './UserEditorDialog';
/**
 * @file UserManagement.tsx
 * @description Phân hệ Quản lý Tài khoản Nội bộ (User Management Feature)
 * Cho phép Quản trị viên (Admin) tạo, chỉnh sửa, phân quyền và khóa/mở khóa tài khoản Staff/Admin.
 */

import type { User } from '../../types';
import { AccountStatusDialog } from './AccountStatusDialog';
import { PasswordChangeDialog } from './PasswordChangeDialog';

import { useUserManagement } from './useUserManagement';
export function UserManagement({
  current_user,
  on_password_changed,
}: {
  current_user: Pick<User, 'id' | 'username'>;
  on_password_changed: () => void;
}) {
  const {
    current_user_id,
    users,
    loading,
    error,
    set_error,
    notice,
    set_notice,
    editing,
    form,
    set_form,
    busy,
    set_refresh,
    query,
    set_query,
    confirm_password,
    set_confirm_password,
    set_username_check,
    changing_id,
    pending_status,
    set_pending_status,
    password_target,
    set_password_target,
    confirm_input,
    dialog,
    modal_open,
    username_state,
    username_blocked,
    changing_own_password,
    close_editor,
    edit,
    save,
    filtered,
    can_edit,
    change_status,
    username_messages,
    is_root_account,
  } = useUserManagement({ current_user, on_password_changed });
  return (
    <section className="user-management">
      <div className="user-permissions">
        <p>
          <strong>Root:</strong> Có thể chỉnh sửa, đổi mật khẩu, phân quyền và khóa hoặc mở khóa cả
          Admin lẫn Staff.
        </p>
        <p>
          <strong>Admin (Quản trị viên):</strong> Toàn bộ quyền của Staff, Giám sát hệ thống, Quản
          lý tài khoản. Có thể chỉnh sửa Staff và khóa hoặc mở khóa các tài khoản khác.
        </p>
        <p>
          <strong>Staff (Nhân viên):</strong> Tổng quan, Quản lý điểm đến (POI).
        </p>
      </div>

      {notice && !modal_open && (
        <div className="notice-banner" role="status">
          {notice}
        </div>
      )}

      {error && !modal_open && !pending_status && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {pending_status && (
        <AccountStatusDialog
          user={pending_status}
          is_self={pending_status.id.toLowerCase() === current_user_id.toLowerCase()}
          busy={busy}
          error={error}
          on_cancel={() => {
            if (!busy) {
              set_pending_status(null);
              set_error('');
            }
          }}
          on_confirm={() => void change_status(pending_status)}
        />
      )}

      {/* Modal tạo mới / chỉnh sửa tài khoản */}
      {modal_open && (
        <UserEditorDialog
          current_user_id={current_user_id}
          error={error}
          set_error={set_error}
          notice={notice}
          editing={editing}
          form={form}
          set_form={set_form}
          busy={busy}
          confirm_password={confirm_password}
          set_confirm_password={set_confirm_password}
          set_username_check={set_username_check}
          set_password_target={set_password_target}
          confirm_input={confirm_input}
          dialog={dialog}
          username_state={username_state}
          username_blocked={username_blocked}
          close_editor={close_editor}
          save={save}
          username_messages={username_messages}
        />
      )}

      {password_target && (
        <PasswordChangeDialog
          username={password_target.username}
          target_user_id={changing_own_password ? undefined : password_target.id}
          on_close={() => set_password_target(null)}
          on_saved={() => {
            set_password_target(null);
            if (changing_own_password) {
              on_password_changed();
              return;
            }
            set_notice(
              `Đã đổi mật khẩu cho ${password_target.username}. Tài khoản cần đăng nhập lại.`,
            );
          }}
        />
      )}

      {/* Bảng danh sách tài khoản */}
      <UserTable
        current_user_id={current_user_id}
        users={users}
        loading={loading}
        set_error={set_error}
        set_notice={set_notice}
        busy={busy}
        set_refresh={set_refresh}
        query={query}
        set_query={set_query}
        changing_id={changing_id}
        set_pending_status={set_pending_status}
        set_password_target={set_password_target}
        edit={edit}
        filtered={filtered}
        can_edit={can_edit}
        is_root_account={is_root_account}
      />
    </section>
  );
}
