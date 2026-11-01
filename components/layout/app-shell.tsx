'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, MicrophoneIcon, BookOpenIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import AccountMenu from '../auth/account-menu';
import './app-shell.css';

const skills = [
  { id: 'speak', label: 'Nói', icon: MicrophoneIcon },
  { id: 'read', label: 'Đọc', icon: BookOpenIcon },
  { id: 'write', label: 'Viết', icon: PencilSquareIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const vocabulary = pathname === '/tu-vung' || pathname.startsWith('/tu-vung/');
  return <div className="learning-app app-shell">
    <a href="#main" className="skip-link">Đến nội dung chính</a>
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="English Space — Trang chủ"><span className="brand-symbol">e<span>.</span></span><span className="brand-caption" lang="en">SPACE</span></Link>
      <nav aria-label="Điều hướng chính">
        <Link className={`nav-item${pathname === '/' ? ' active' : ''}`} href="/" aria-current={pathname === '/' ? 'page' : undefined}><HomeIcon width={23} height={23} aria-hidden="true"/><span>Trang chủ</span></Link>
        <Link className={`nav-item${vocabulary ? ' active' : ''}`} href="/tu-vung" aria-current={vocabulary ? 'page' : undefined}><BookOpenIcon width={23} height={23} aria-hidden="true"/><span>Từ vựng</span></Link>
        <div className="nav-divider"/>
        {skills.map(({ id, label, icon: Icon }) => <Link className="nav-item" href={`/#${id}`} key={id}><Icon width={23} height={23} aria-hidden="true"/><span>{label}</span></Link>)}
      </nav>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <span className="header-title">Home</span>
        <div className="topbar-right"><AccountMenu key={pathname}/></div>
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
