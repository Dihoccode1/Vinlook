/**
 * @file UserManagement.tsx
 * @description Phân hệ Quản lý Tài khoản Nội bộ (User Management Feature)
 * Cho phép Quản trị viên (Admin) tạo, chỉnh sửa, phân quyền và khóa/mở khóa tài khoản Staff/Admin.
 */

import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';
import { AccountStatusDialog } from './AccountStatusDialog';
import { PasswordChangeDialog } from './PasswordChangeDialog';

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
  password: '',
};

const username_messages = {
  idle: '',
  invalid: 'Nhập từ 3 đến 100 ký tự. Dùng chữ, số, dấu chấm, gạch dưới hoặc gạch nối.',
  checking: 'Đang kiểm tra tên tài khoản…',
  available: 'Tên tài khoản có thể sử dụng.',
  taken: 'Tên tài khoản đã được sử dụng hoặc dành riêng.',
  unavailable: 'Chưa kiểm tra được tên. Hệ thống sẽ kiểm tra lại khi lưu.',
};

function is_root_account(user: Pick<User, 'username'>) {
  return user.username.toLowerCase() === 'admin';
}

function role_order(user: User) {
  if (is_root_account(user)) return 0;
  return user.role === 'admin' ? 1 : 2;
}

export function UserManagement({
  current_user,
  on_password_changed,
}: {
  current_user: Pick<User, 'id' | 'username'>;
  on_password_changed: () => void;
}) {
  const current_user_id = current_user.id;
  const is_root = is_root_account(current_user);
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
  const [username_check, set_username_check] = useState<
    'available' | 'taken' | 'unavailable' | null
  >(null);
  const [changing_id, set_changing_id] = useState<string | null>(null);
  const [pending_status, set_pending_status] = useState<User | null>(null);
  const [password_target, set_password_target] = useState<User | null>(null);

  const confirm_input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const modal_open = editing !== undefined;
  const checking_username = editing === null && /^[a-zA-Z0-9_.-]{3,100}$/.test(form.username);
  const username_state =
    editing !== null || !form.username
      ? 'idle'
      : checking_username
        ? (username_check ?? 'checking')
        : 'invalid';
  const username_blocked = username_state === 'checking' || username_state === 'taken';
  const changing_own_password = password_target?.id.toLowerCase() === current_user_id.toLowerCase();

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

  useEffect(() => {
    if (!checking_username || busy) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await api<{ data: { available: boolean } }>(
          `/users/availability?${new URLSearchParams({ username: form.username })}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          set_username_check(result.data.available ? 'available' : 'taken');
        }
      } catch {
        if (!controller.signal.aborted) set_username_check('unavailable');
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [checking_username, form.username, busy]);

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
    if (user && !can_edit(user)) return;
    set_editing(user);
    set_username_check(null);
    set_form(
      user
        ? {
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            status: user.status,
            password: '',
          }
        : BLANK_FORM,
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
    if (busy || username_blocked) return;

    if (form.password !== confirm_password) {
      set_error('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      confirm_input.current?.focus();
      return;
    }

    set_busy(true);
    if (editing === null) set_username_check(null);
    set_error('');

    try {
      const { password, ...rest } = form;
      await api(editing ? `/users/${editing.id}` : '/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rest,
          ...(!editing ? { full_name: form.username } : {}),
          ...(password ? { password } : {}),
        }),
      });

      set_editing(undefined);
      set_form(BLANK_FORM);
      set_confirm_password('');
      set_notice('Đã lưu tài khoản thành công.');
      set_refresh((v) => v + 1);

      // Khóa tài khoản đang đăng nhập sẽ kết thúc phiên.
      if (
        editing?.id.toLowerCase() === current_user_id.toLowerCase() &&
        form.status === 'disabled'
      ) {
        window.dispatchEvent(new Event('admin-session-expired'));
      }
    } catch (e) {
      set_error(e instanceof Error ? e.message : 'Không thể lưu tài khoản.');
    } finally {
      set_busy(false);
    }
  }

  const filtered = users
    .filter((u) =>
      `${u.username} ${u.full_name}`
        .toLocaleLowerCase('vi')
        .includes(query.toLocaleLowerCase('vi')),
    )
    .sort((a, b) => role_order(a) - role_order(b));

  function can_edit(user: User) {
    return (
      is_root || user.role === 'staff' || user.id.toLowerCase() === current_user_id.toLowerCase()
    );
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
          body: JSON.stringify({ status }),
        },
      );

      set_users((previous) =>
        previous.map((item) =>
          item.id.toLowerCase() === result.data.id.toLowerCase()
            ? {
                ...item,
                status: result.data.status,
                login_locked: result.data.status === 'active' ? false : item.login_locked,
              }
            : item,
        ),
      );
      set_pending_status(null);

      if (user.id.toLowerCase() === current_user_id.toLowerCase() && status === 'disabled') {
        window.dispatchEvent(new Event('admin-session-expired'));
        return;
      }

      set_notice(
        status === 'disabled'
          ? `Đã khóa tài khoản ${user.username}. Các phiên đăng nhập đã bị thu hồi.`
          : `Đã mở khóa tài khoản ${user.username}.`,
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
                <div>
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
                  Trạng thái
                  <select
                    value={form.status}
                    disabled={busy || editing?.username.toLowerCase() === 'admin'}
                    onChange={(e) =>
                      set_form({ ...form, status: e.target.value as User['status'] })
                    }
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
                      {u.username}
                      {u.id === current_user_id ? ' (Bạn)' : ''}
                    </strong>
                    {u.full_name !== u.username && <div>{u.full_name}</div>}
                  </td>
                  <td data-label="Quyền hạn">
                    <span className={`role-badge ${u.role}`}>
                      {is_root_account(u) ? 'Root' : u.role === 'admin' ? 'Admin' : 'Staff'}
                    </span>
                  </td>
                  <td data-label="Trạng thái">
                    <span className={`publish-status ${u.status === 'active' ? 'published' : ''}`}>
                      {u.status === 'active'
                        ? 'Hoạt động'
                        : u.login_locked
                          ? 'Đã khóa · Sai mật khẩu 15 lần'
                          : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <div className="account-actions">
                      <button
                        className="account-edit"
                        disabled={busy || !can_edit(u)}
                        title={
                          !can_edit(u) ? 'Không được chỉnh sửa tài khoản Admin khác' : undefined
                        }
                        onClick={() => edit(u)}
                      >
                        Chỉnh sửa
                      </button>
                      {can_edit(u) && (
                        <button
                          className="account-password"
                          type="button"
                          disabled={busy}
                          aria-label={`Đổi mật khẩu cho ${u.username}`}
                          onClick={() => set_password_target(u)}
                        >
                          Đổi mật khẩu
                        </button>
                      )}
                      {!(u.username.toLowerCase() === 'admin' && u.status === 'active') && (
                        <button
                          className={u.status === 'active' ? 'account-lock' : 'account-unlock'}
                          disabled={busy}
                          aria-label={`${u.status === 'active' ? 'Khóa' : 'Mở khóa'} tài khoản ${u.username}`}
                          onClick={() => {
                            set_error('');
                            set_notice('');
                            set_pending_status(u);
                          }}
                        >
                          {changing_id === u.id
                            ? 'Đang xử lý...'
                            : u.status === 'active'
                              ? 'Khóa'
                              : 'Mở khóa'}
                        </button>
                      )}
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
