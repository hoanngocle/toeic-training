'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, TrophyIcon, MicrophoneIcon, BookOpenIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { AppUser } from '../../lib/accounts/policy';
import AccountMenu from '../auth/account-menu';
import './app-shell.css';

const skills = [
  { id: 'speak', label: 'Nói', icon: MicrophoneIcon },
  { id: 'read', label: 'Đọc', icon: BookOpenIcon },
  { id: 'write', label: 'Viết', icon: PencilSquareIcon },
];

export default function AppShell({ children, user }: { children: React.ReactNode; user: AppUser }) {
  const pathname = usePathname();
  const vocabulary = pathname === '/tu-vung' || pathname.startsWith('/tu-vung/');
  return <div className="learning-app app-shell">
    <a href="#main" className="skip-link">Đến nội dung chính</a>
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="English Space — Trang chủ"><span className="brand-symbol">e<span>.</span></span><span className="brand-caption" lang="en">SPACE</span></Link>
      <nav aria-label="Điều hướng chính">
        <Link className={`nav-item${pathname === '/' ? ' active' : ''}`} href="/" aria-current={pathname === '/' ? 'page' : undefined}><HomeIcon width={23} height={23} aria-hidden="true"/><span>Trang chủ</span></Link>
        <Link className={`nav-item${vocabulary ? ' active' : ''}`} href="/tu-vung" aria-current={vocabulary ? 'page' : undefined}><BookOpenIcon width={23} height={23} aria-hidden="true"/><span>Từ vựng</span></Link>
        <Link className={`nav-item${pathname === '/achievements' ? ' active' : ''}`} href="/achievements" aria-current={pathname === '/achievements' ? 'page' : undefined}><TrophyIcon width={23} height={23} aria-hidden="true"/><span>Thành tích</span></Link>
        <div className="nav-divider"/>
        {skills.map(({ id, label, icon: Icon }) => <Link className="nav-item" href={`/#${id}`} key={id}><Icon width={23} height={23} aria-hidden="true"/><span>{label}</span></Link>)}
      </nav>
    </aside>
    <div className="workspace">
      <header className={`topbar${pathname === "/" ? " home-topbar" : ""}`}>
        {pathname !== "/" && <span className="header-title">{pathname === "/achievements" ? "Thành tích" : pathname === "/admin/users" ? "Quản lý tài khoản" : "Home"}</span>}
        <div className="topbar-right"><AccountMenu key={pathname} user={user}/></div>
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
