import { useEffect, useState } from 'react';
import App from './App';

export function AdminAccess() {
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/auth/session', { signal: controller.signal }).then(async response => {
      if (!response.ok) { if (response.status !== 401) throw new Error(); return; }
      const body = await response.json(); if (!controller.signal.aborted) setUser(body.data.username);
    }).catch(() => { if (!controller.signal.aborted) setError('Không kết nối được máy chủ. Vui lòng thử lại.'); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    const expired = () => { setUser(null); setPassword(''); setError('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.'); };
    window.addEventListener('admin-session-expired', expired);
    return () => { controller.abort(); window.removeEventListener('admin-session-expired', expired); };
  }, []);
  async function login(event: React.SubmitEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-vinlook-admin': '1' }, body: JSON.stringify({ username: username.trim(), password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Không đăng nhập được.');
      setUser(body.data.username); setPassword('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không kết nối được máy chủ.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    const response = await fetch('/api/admin/auth/logout', { method: 'POST', headers: { 'x-vinlook-admin': '1' } });
    if (!response.ok && response.status !== 401) throw new Error('Chưa đăng xuất được. Vui lòng thử lại.');
    setUser(null); setPassword(''); setError('');
  }
  if (checking) return <div className="login-page"><p role="status">Đang kiểm tra đăng nhập…</p></div>;
  if (user) return <App onLogout={logout}/>;
  return <main className="login-page"><section className="login-card" aria-labelledby="login-title">
    <a className="login-brand" href="/">vinlook<span>.</span></a>
    <p className="eyebrow">KHÔNG GIAN ĐIỀU HÀNH</p><h1 id="login-title">Đăng nhập quản trị</h1><p className="login-intro">Quản lý điểm đến và theo dõi hoạt động của Vinlook.</p>
    <form onSubmit={login} aria-busy={busy}>
      <label htmlFor="admin-username">Tài khoản</label><input id="admin-username" autoComplete="username" required maxLength={100} value={username} onChange={event => setUsername(event.target.value)} autoFocus placeholder="Nhập tài khoản" disabled={busy}/>
      <label htmlFor="admin-password">Mật khẩu</label><input id="admin-password" type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={event => setPassword(event.target.value)} placeholder="Nhập mật khẩu" disabled={busy}/>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
    <a className="login-map-link" href="http://127.0.0.1:5173/">← Về bản đồ khám phá</a>
  </section></main>;
}
