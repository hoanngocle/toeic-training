'use client';

import { useState, type FormEvent } from 'react';

export default function LoginForm({ destination }: { destination: string }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Chưa thể đăng nhập. Vui lòng thử lại.'); setPending(false); return; }
      window.location.assign(destination);
    } catch { setError('Không thể kết nối. Vui lòng thử lại.'); setPending(false); }
  }
  return <form className="login-form" onSubmit={submit} aria-busy={pending}>
    <label htmlFor="username">Tài khoản</label>
    <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Nhập tài khoản" maxLength={100} required disabled={pending} />
    <label htmlFor="password">Mật khẩu</label>
    <div className="login-password"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" maxLength={256} required disabled={pending} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div>
    <div className="login-error" role="alert">{error}</div>
    <button className="login-submit" type="submit" disabled={pending}>{pending ? 'Đang đăng nhập…' : 'Đăng nhập'}<span aria-hidden="true">→</span></button>
  </form>;
}
