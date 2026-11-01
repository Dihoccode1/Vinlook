import { useEffect, useState } from 'react';
import App from './App';

export function AdminAccess() {
  const [user, set_user] = useState<{id:string;username:string;role:'admin'|'staff'} | null>(null);
  const [checking, set_checking] = useState(true);
  const [username, set_username] = useState('');
  const [password, set_password] = useState('');
  const [show_password, set_show_password] = useState(false);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/auth/session', { signal: controller.signal }).then(async response => {
      if (!response.ok) { if (response.status !== 401) throw new Error(); return; }
      const body = await response.json(); if (!controller.signal.aborted) set_user(body.data);
    }).catch(() => { if (!controller.signal.aborted) set_error('Không kết nối được máy chủ. Vui lòng thử lại.'); }).finally(() => { if (!controller.signal.aborted) set_checking(false); });
    const expired = () => { set_user(null); set_password(''); set_error('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.'); };
    window.addEventListener('admin-session-expired', expired);
    return () => { controller.abort(); window.removeEventListener('admin-session-expired', expired); };
  }, []);
  async function login(event: React.SubmitEvent) {
    event.preventDefault(); if (busy) return; set_busy(true); set_error('');
    set_show_password(false);
    try {
      const response = await fetch('/api/admin/auth/login', { method: 'POST', headers: { 'content-Type': 'application/json', 'x-vinlook-admin': '1' }, body: JSON.stringify({ username: username.trim(), password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Không đăng nhập được.');
      set_user(body.data); set_password('');
    } catch (failure) { set_error(failure instanceof Error ? failure.message : 'Không kết nối được máy chủ.'); }
    finally { set_busy(false); }
  }
  async function logout() {
    const response = await fetch('/api/admin/auth/logout', { method: 'POST', headers: { 'x-vinlook-admin': '1' } });
    if (!response.ok && response.status !== 401) throw new Error('Chưa đăng xuất được. Vui lòng thử lại.');
    set_user(null); set_password(''); set_error('');
  }
  if (checking) return <div className="login-page"><p role="status">Đang kiểm tra đăng nhập…</p></div>;
  if (user) return <App key={user.id} user={user} on_logout={logout}/>;
  return <main className="login-page"><section className="login-card" aria-labelledby="login-title">
    <a className="login-brand" href="/">vinlook<span>.</span></a>
    <p className="eyebrow">KHÔNG GIAN ĐIỀU HÀNH</p><h1 id="login-title">Đăng nhập quản trị</h1><p className="login-intro">Quản lý điểm đến và theo dõi hoạt động của Vinlook.</p>
    <form onSubmit={login} aria-busy={busy}>
      <label htmlFor="admin-username">Tài khoản</label><input id="admin-username" autoComplete="username" required maxLength={100} value={username} onChange={event => set_username(event.target.value)} autoFocus placeholder="Nhập tài khoản" disabled={busy}/>
      <label htmlFor="admin-password">Mật khẩu</label><div className="login-password-field"><input id="admin-password" type={show_password ? 'text' : 'password'} autoComplete="current-password" required maxLength={200} value={password} onChange={event => set_password(event.target.value)} placeholder="Nhập mật khẩu" disabled={busy}/><button type="button" className="login-password-toggle" aria-label={show_password ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={show_password} aria-controls="admin-password" title={show_password ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => set_show_password(value => !value)} disabled={busy}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{show_password && <path d="m3 3 18 18"/>}</svg></button></div>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
    <a className="login-map-link" href={import.meta.env.VITE_PUBLIC_WEB_URL || (import.meta.env.PROD ? "/" : "http://127.0.0.1:5173/")}>← Về bản đồ khám phá</a>
  </section></main>;
}
