import { useUsers } from './useUsers';
import { useUsernameAvailability } from './useUsernameAvailability';

import React, { useRef, useState } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';

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

export function useUserManagement({
  current_user,
  on_password_changed,
}: {
  current_user: Pick<User, 'id' | 'username'>;
  on_password_changed: () => void;
}) {
  const current_user_id = current_user.id;
  const is_root = is_root_account(current_user);
  const [error, set_error] = useState('');
  const [notice, set_notice] = useState('');
  const [editing, set_editing] = useState<User | null | undefined>(undefined);
  const [form, set_form] = useState<UserFormData>(BLANK_FORM);
  const [busy, set_busy] = useState(false);
  const [refresh, set_refresh] = useState(0);
  const { users, set_users, loading } = useUsers(refresh, set_error);
  const [query, set_query] = useState('');
  const [confirm_password, set_confirm_password] = useState('');
  const { username_check, set_username_check } = useUsernameAvailability(
    editing === null && /^[a-zA-Z0-9_.-]{3,100}$/.test(form.username),
    form.username,
    busy,
  );
  const [changing_id, set_changing_id] = useState<string | null>(null);
  const [pending_status, set_pending_status] = useState<User | null>(null);
  const [password_target, set_password_target] = useState<User | null>(null);

  const confirm_input = useRef<HTMLInputElement>(null);
  const modal_open = editing !== undefined;
  const checking_username = editing === null && /^[a-zA-Z0-9_.-]{3,100}$/.test(form.username);
  const username_state: keyof typeof username_messages =
    editing !== null || !form.username
      ? 'idle'
      : checking_username
        ? (username_check ?? 'checking')
        : 'invalid';
  const username_blocked = username_state === 'checking' || username_state === 'taken';
  const changing_own_password = password_target?.id.toLowerCase() === current_user_id.toLowerCase();

  function close_editor() {
    if (busy) return;
    set_editing(undefined);
    set_form(BLANK_FORM);
    set_confirm_password('');
    set_error('');
  }

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

  return {
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
    on_password_changed,
  };
}
