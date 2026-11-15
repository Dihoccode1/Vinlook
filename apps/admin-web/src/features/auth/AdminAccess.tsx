/**
 * @file AdminAccess.tsx
 * @description Phân hệ Xác thực & Truy cập Quản trị (Auth Feature)
 * Quản lý phiên làm việc, đăng nhập tài khoản Admin/Staff, và tự động xử lý khi phiên hết hạn.
 */

import React, { useEffect, useState } from 'react';
import { Alert } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { Card } from '@vinlook/ui/card';
import { Input } from '@vinlook/ui/input';
import { Label } from '@vinlook/ui/label';
import App from '../../App';

interface AuthSessionUser {
  id: string;
  username: string;
  role: 'admin' | 'staff';
}

/**
 * Component xử lý xác thực truy cập quản trị
 */
export function AdminAccess() {
  const [user, set_user] = useState<AuthSessionUser | null>(null);
  const [checking, set_checking] = useState(true);
  const [username, set_username] = useState('');
  const [password, set_password] = useState('');
  const [show_password, set_show_password] = useState(false);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState('');
  const [password_changed, set_password_changed] = useState(false);
  const [retry_at, set_retry_at] = useState(0);
  const [now, set_now] = useState(Date.now);
  const [retry_user, set_retry_user] = useState('');
  const retry_seconds =
    retry_user === username.trim().toLowerCase()
      ? Math.max(0, Math.ceil((retry_at - now) / 1000))
      : 0;
  useEffect(() => {
    if (!retry_at) return;
    const timer = window.setInterval(() => set_now(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [retry_at]);

  // Kiểm tra phiên đăng nhập hiện có khi tải trang
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/admin/auth/session', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status !== 401) throw new Error();
          return;
        }
        const body = await response.json();
        if (!controller.signal.aborted) set_user(body.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          set_error('Không thể kết nối máy chủ. Vui lòng kiểm tra dịch vụ.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) set_checking(false);
      });

    // Lắng nghe sự kiện phiên làm việc hết hạn từ các API call
    const expired = () => {
      set_user(null);
      set_password('');
      set_error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };

    window.addEventListener('admin-session-expired', expired);
    return () => {
      controller.abort();
      window.removeEventListener('admin-session-expired', expired);
    };
  }, []);

  /**
   * Xử lý đăng nhập tài khoản quản trị
   */
  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (busy || retry_seconds > 0) return;
    set_busy(true);
    set_error('');
    set_password_changed(false);
    set_show_password(false);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinlook-admin': '1',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const body = await response.json();
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After') ?? body.error?.retry_after);
        if (Number.isFinite(seconds) && seconds > 0) {
          set_now(Date.now());
          set_retry_at(Date.now() + seconds * 1000);
          set_retry_user(username.trim().toLowerCase());
        }
      }
      if (!response.ok) {
        throw new Error(body.error?.message ?? 'Đăng nhập không thành công.');
      }

      set_user(body.data);
      set_password('');
    } catch (failure) {
      set_error(failure instanceof Error ? failure.message : 'Không thể kết nối máy chủ.');
    } finally {
      set_busy(false);
    }
  }

  /**
   * Xử lý đăng xuất tài khoản quản trị
   */
  async function logout() {
    const response = await fetch('/api/admin/auth/logout', {
      method: 'POST',
      headers: { 'x-vinlook-admin': '1' },
    });

    if (!response.ok && response.status !== 401) {
      throw new Error('Chưa đăng xuất được. Vui lòng thử lại.');
    }

    set_user(null);
    set_password('');
    set_error('');
  }

  // Màn hình chờ khi đang kiểm tra session cookie
  if (checking) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top_left,#e1ebda,transparent_65%),#f5f7f1] p-7">
        <p role="status" className="text-sm text-[#768573]">
          Đang kiểm tra phiên đăng nhập...
        </p>
      </div>
    );
  }

  // Khi đã đăng nhập hợp lệ, render giao diện chính ứng dụng quản trị
  if (user) {
    return (
      <App
        key={user.id}
        user={user}
        on_logout={logout}
        on_password_changed={() => {
          set_username(user.username);
          set_password('');
          set_show_password(false);
          set_error('');
          set_retry_at(0);
          set_password_changed(true);
          set_user(null);
        }}
      />
    );
  }

  // Màn hình form đăng nhập
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top_left,#e1ebda,transparent_65%),#f5f7f1] p-5 sm:p-7">
      <Card
        aria-labelledby="login-title"
        className="w-full max-w-[450px] gap-0 rounded-[20px] border-[#dde5d8] bg-[#fffefb] p-7 shadow-[0_18px_65px_#153f3210] sm:p-10"
      >
        <a
          className="inline-block text-[38px] leading-none font-bold tracking-[-1.5px] text-primary no-underline"
          href="/"
        >
          vinlook<span className="text-[#d98b45]">.</span>
        </a>
        <p className="mt-6 mb-2.5 text-[11px] font-semibold tracking-[1.7px] text-[#8b9a7c] uppercase">
          KHÔNG GIAN ĐIỀU HÀNH
        </p>
        <h1
          id="login-title"
          className="m-0 mb-3 text-[26px] leading-[1.35] font-semibold text-foreground"
        >
          Đăng nhập quản trị
        </h1>
        <p className="m-0 mb-7 text-sm leading-relaxed text-[#768573]">
          Quản lý điểm đến và theo dõi hoạt động của nền tảng Vinlook.
        </p>

        <form onSubmit={login} aria-busy={busy} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="admin-username" className="text-sm font-medium text-foreground">
              Tài khoản
            </Label>
            <Input
              id="admin-username"
              autoComplete="username"
              required
              maxLength={100}
              value={username}
              onChange={(event) => set_username(event.target.value)}
              autoFocus
              placeholder="Nhập tên tài khoản"
              disabled={busy}
              className="h-auto rounded-[9px] border-[#d4dfcf] bg-[#fcfdf9] px-3.5 py-3 text-base text-[#294532]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="admin-password" className="text-sm font-medium text-foreground">
              Mật khẩu
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={show_password ? 'text' : 'password'}
                autoComplete="current-password"
                required
                maxLength={200}
                value={password}
                onChange={(event) => set_password(event.target.value)}
                placeholder="Nhập mật khẩu"
                disabled={busy}
                className="h-auto rounded-[9px] border-[#d4dfcf] bg-[#fcfdf9] py-3 pr-14 pl-3.5 text-base text-[#294532]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1.5 h-11 w-11 -translate-y-1/2 rounded-[7px] text-[#54715e] hover:bg-[#edf3e8] hover:text-[#294532]"
                aria-label={show_password ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={show_password}
                aria-controls="admin-password"
                title={show_password ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => set_show_password((value) => !value)}
                disabled={busy}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {show_password && <path d="m3 3 18 18" />}
                </svg>
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" role="alert" className="text-[13px]">
              {error}
            </Alert>
          )}
          {password_changed && (
            <Alert variant="success" role="status" className="text-[13px]">
              Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.
            </Alert>
          )}

          <Button
            className="mt-2 h-auto w-full rounded-[9px] py-3.5 text-base font-medium"
            type="submit"
            disabled={busy || retry_seconds > 0}
          >
            {busy
              ? 'Đang đăng nhập...'
              : retry_seconds > 0
                ? `Thử lại sau ${retry_seconds} giây`
                : 'Đăng nhập'}
          </Button>
        </form>

        <a
          className="mt-6 inline-block text-[13px] text-[#73896b] no-underline hover:text-primary hover:underline"
          href={
            import.meta.env.VITE_PUBLIC_WEB_URL ||
            (import.meta.env.PROD ? '/' : 'http://127.0.0.1:5173/')
          }
        >
          ← Về bản đồ khám phá du lịch
        </a>
      </Card>
    </main>
  );
}
