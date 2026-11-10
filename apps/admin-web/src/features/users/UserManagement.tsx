/**
 * @file UserManagement.tsx
 * @description Phân hệ Quản lý Tài khoản Nội bộ (User Management Feature)
 * Cho phép Quản trị viên (Admin) tạo, chỉnh sửa, phân quyền và khóa/mở khóa tài khoản Staff/Admin.
 */

import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';
import { AccountStatusDialog } from './AccountStatusDialog';

interface UserFormData {
  username: string;
  full_name: string;
  role: User['role'];
  status: User['status'];
  password?: string;
}

const BLANK_FORM: UserFormData = {
  username: '',
  full_name: '',
  role: 'staff',
  status: 'active',
  password: ''
};

export function UserManagement({ current_user_id }: { current_user_id: string }) {
  const [users, set_users] = useState<User[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState('');
  const [notice, set_notice] = useState('');
  const [editing, set_editing] = useState<User | null | undefined>(undefined);
  const [form, set_form] = useState<UserFormData>(BLANK_FORM);
  const [busy, set_busy] = useState(false);
  const [refresh, set_refresh] = useState(0);
  const [query, set_query] = useState('');
  const [confirm_password, set_confirm_password] = useState('');
  const [changing_id, set_changing_id] = useState<string | null>(null);
  const [pending_status, set_pending_status] = useState<User | null>(null);

  const confirm_input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const modal_open = editing !== undefined;

  // Quản lý hiển thị dialog modal cho tạo / sửa tài khoản
  useEffect(() => {
    if (!modal_open) return;
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;

    element?.showModal();
    element?.querySelector('input')?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [modal_open]);

  function close_editor() {
    if (busy) return;
    set_editing(undefined);
    set_form(BLANK_FORM);
    set_confirm_password('');
    set_error('');
  }

  // Tải danh sách người dùng từ API Gateway
  useEffect(() => {
    const controller = new AbortController();
    set_loading(true);
    set_error('');

    api<{ data: User[] }>('/users', { signal: controller.signal })
      .then((r) => {
        if (!controller.signal.aborted) set_users(r.data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) set_error(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) set_loading(false);
      });

    return () => controller.abort();
  }, [refresh]);

  function edit(user: User | null) {
    if (user && is_other_admin(user)) return;
    set_editing(user);
    set_form(
      user
        ? {
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            status: user.status,
            password: ''
          }
        : BLANK_FORM
    );
    set_confirm_password('');
    set_error('');
    set_notice('');
  }

  /**
   * Lưu thông tin tạo mới hoặc cập nhật tài khoản
   */
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (form.password !== confirm_password) {
      set_error('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      confirm_input.current?.focus();
      return;
    }

    set_busy(true);
    set_error('');

    try {
      const { password, ...rest } = form;
      await api(editing ? `/users/${editing.id}` : '/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rest,
          ...(!editing ? { full_name: form.username } : {}),
          ...(password ? { password } : {})
        })
      });

      set_editing(undefined);
      set_form(BLANK_FORM);
      set_confirm_password('');
      set_notice('Đã lưu tài khoản thành công. Nếu thay đổi mật khẩu hoặc quyền hạn, tài khoản cần đăng nhập lại.');
      set_refresh((v) => v + 1);

      // Nếu người dùng đang chỉnh sửa chính mình và đổi mật khẩu/khóa, kết thúc session
      if (
        editing?.id.toLowerCase() === current_user_id.toLowerCase() &&
        (password || form.status === 'disabled')
      ) {
        window.dispatchEvent(new Event('admin-session-expired'));
      }
    } catch (e) {
      set_error(e instanceof Error ? e.message : 'Không thể lưu tài khoản.');
    } finally {
      set_busy(false);
    }
  }

  const filtered = users.filter((u) =>
    `${u.username} ${u.full_name}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
  );

  function is_other_admin(user: User) {
    return user.role === 'admin' && user.id.toLowerCase() !== current_user_id.toLowerCase();
  }

  /**
   * Khóa hoặc mở khóa trạng thái tài khoản
   */
  async function change_status(user: User) {
    if (busy || (user.username.toLowerCase() === 'admin' && user.status === 'active')) return;
    const status = user.status === 'active' ? 'disabled' : 'active';
    set_busy(true);
    set_changing_id(user.id);
    set_error('');
    set_notice('');

    try {
      const result = await api<{ data: { id: string; status: User['status'] } }>(
        `/users/${user.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        }
      );

      set_users((previous) =>
        previous.map((item) =>
          item.id.toLowerCase() === result.data.id.toLowerCase()
            ? { ...item, status: result.data.status, login_locked: result.data.status === 'active' ? false : item.login_locked }
            : item
        )
      );
      set_pending_status(null);

      if (user.id.toLowerCase() === current_user_id.toLowerCase() && status === 'disabled') {
        window.dispatchEvent(new Event('admin-session-expired'));
        return;
      }

      set_notice(
        status === 'disabled'
          ? `Đã khóa tài khoản ${user.username}. Các phiên đăng nhập đã bị thu hồi.`
          : `Đã mở khóa tài khoản ${user.username}.`
      );
      set_refresh((value) => value + 1);
    } catch (e) {
      set_error(e instanceof Error ? e.message : 'Không cập nhật được trạng thái tài khoản.');
    } finally {
      set_busy(false);
      set_changing_id(null);
    }
  }

  return (
    <section className="user-management">
      <div className="user-permissions">
        <p>
          <strong>Staff (Nhân viên):</strong> Tổng quan, Quản lý điểm đến (POI).
        </p>
        <p>
          <strong>Admin (Quản trị viên):</strong> Toàn bộ quyền của Staff, Giám sát hệ thống, Quản lý tài khoản. Có thể khóa và mở khóa Staff hoặc Admin khác. Không được chỉnh sửa thông tin, đổi mật khẩu hay hạ quyền Admin khác.
        </p>
      </div>

      {notice && (
        <div className="notice-banner" role="status">
          {notice}
        </div>
      )}

      {error && !modal_open && !pending_status && (
        <div className="error-banner" role="alert">{error}</div>
      )}

      {pending_status && <AccountStatusDialog
        user={pending_status}
        is_self={pending_status.id.toLowerCase() === current_user_id.toLowerCase()}
        busy={busy}
        error={error}
        on_cancel={() => { if (!busy) { set_pending_status(null); set_error(''); } }}
        on_confirm={() => void change_status(pending_status)}
      />}

      {/* Modal tạo mới / chỉnh sửa tài khoản */}
      {modal_open && (
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
                    onChange={(e) => set_form({ ...form, username: e.target.value })}
                  />
                </label>

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

                <label>
                  Quyền hạn
                  <select
                    value={form.role}
                    disabled={
                      busy ||
                      (!!editing &&
                        (editing.id.toLowerCase() === current_user_id.toLowerCase() ||
                          editing.role === 'admin'))
                    }
                    onChange={(e) => set_form({ ...form, role: e.target.value as User['role'] })}
                  >
                    <option value="staff">Staff (Nhân viên)</option>
                    <option value="admin">Admin (Quản trị viên)</option>
                  </select>
                </label>

                <div className="password-pair form-grid">
                  <label>
                    {editing ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu'}
                    <input
                      type="password"
                      autoComplete="new-password"
                      required={!editing}
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

                  {(!editing || form.password) && (
                    <label>
                      {editing ? 'Xác nhận mật khẩu mới' : 'Xác nhận mật khẩu'}
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
                  )}
                </div>

                <label>
                  Trạng thái
                  <select
                    value={form.status}
                    disabled={busy || editing?.username.toLowerCase() === 'admin'}
                    onChange={(e) =>
                      set_form({ ...form, status: e.target.value as User['status'] })
                    }
                  >
                    <option value="active">Đang hoạt động</option>
                    <option
                      value="disabled"
                      disabled={
                        !!editing &&
                        editing.role === 'admin' &&
                        editing.id.toLowerCase() !== current_user_id.toLowerCase() &&
                        editing.status === 'active'
                      }
                    >
                      Đã khóa
                    </option>
                  </select>
                </label>
              </div>

              <p className="field-note">
                Mật khẩu được lưu an toàn và không hiển thị lại. Chỉ nhập mật khẩu mới khi cần thay đổi.
              </p>

              {error && (
                <div className="error-banner" role="alert">
                  {error}
                </div>
              )}
            </div>

            <footer className="user-form-actions">
              <button type="button" disabled={busy} onClick={close_editor}>
                Hủy bỏ
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Đang lưu...' : 'Lưu tài khoản'}
              </button>
            </footer>
          </form>
        </dialog>
      )}

      {/* Bảng danh sách tài khoản */}
      <section className="panel">
        <div className="panel-title">
          <h2>Danh sách tài khoản ({users.length})</h2>
          <button className="primary" disabled={busy} onClick={() => edit(null)}>
            + Tạo tài khoản
          </button>
        </div>

        <div className="filters">
          <label className="search">
            <input
              type="search"
              aria-label="Tìm tài khoản"
              placeholder="Tìm tài khoản hoặc họ tên..."
              value={query}
              onChange={(e) => set_query(e.target.value)}
            />
          </label>
          <button disabled={loading || busy} onClick={() => set_refresh((v) => v + 1)}>
            Làm mới
          </button>
        </div>

        <div className="table-wrap" aria-busy={loading}>
          <table>
            <thead>
              <tr>
                <th>Tài khoản / Họ tên</th>
                <th>Quyền hạn</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>
                      {u.username}{u.username.toLowerCase() === 'admin' ? ' · Root' : ''}
                      {u.id === current_user_id ? ' (Bạn)' : ''}
                    </strong>
                    {u.full_name !== u.username && <div>{u.full_name}</div>}
                  </td>
                  <td data-label="Quyền hạn">
                    <span className={`role-badge ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Staff'}</span>
                  </td>
                  <td data-label="Trạng thái">
                    <span className={`publish-status ${u.status === 'active' ? 'published' : ''}`}>
                      {u.status === 'active' ? 'Hoạt động' : u.login_locked ? 'Đã khóa · Sai mật khẩu 15 lần' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <div className="account-actions">
                      <button
                        disabled={busy || is_other_admin(u)}
                        title={is_other_admin(u) ? 'Không được chỉnh sửa tài khoản Admin khác' : undefined}
                        onClick={() => edit(u)}
                      >
                        Chỉnh sửa
                      </button>
                      {!(u.username.toLowerCase() === 'admin' && u.status === 'active') && <button
                        className={u.status === 'active' ? 'account-lock' : 'account-unlock'}
                        disabled={busy}
                        aria-label={`${u.status === 'active' ? 'Khóa' : 'Mở khóa'} tài khoản ${u.username}`}
                        onClick={() => { set_error(''); set_notice(''); set_pending_status(u); }}
                      >
                        {changing_id === u.id
                          ? 'Đang xử lý...'
                          : u.status === 'active'
                          ? 'Khóa'
                          : 'Mở khóa'}
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading ? (
            <p className="empty-state">Đang tải danh sách tài khoản...</p>
          ) : !filtered.length ? (
            <p className="empty-state">Không tìm thấy tài khoản phù hợp.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
