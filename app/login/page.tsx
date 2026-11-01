import { redirect } from 'next/navigation';
import { isAuthenticated } from '../../lib/auth-server';
import { safeReturnPath } from '../../lib/auth';
import LoginForm from './login-form';
import './login.css';

export const metadata = { title: 'Đăng nhập | English Space' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const destination = safeReturnPath(typeof params.next === 'string' ? params.next : null);
  if (await isAuthenticated()) redirect(destination);
  return <main className="login-page">
    <header className="login-header"><span className="login-brand" lang="en">english space<span>.</span></span></header>
    <section className="login-card" aria-labelledby="login-heading">
      <div className="login-mark" aria-hidden="true">e<span>.</span></div>
      <p className="login-eyebrow">KHÔNG GIAN HỌC TẬP CỦA BẠN</p>
      <h1 id="login-heading">Chào mừng trở lại.</h1>
      <p className="login-description">Đăng nhập để tiếp tục hành trình học tiếng Anh.</p>
      <LoginForm destination={destination} />
    </section>
    <footer className="login-footer">Học một chút, tiến bộ mỗi ngày.</footer>
  </main>;
}
