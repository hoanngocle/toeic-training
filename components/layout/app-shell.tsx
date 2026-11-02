'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, TrophyIcon, BookOpenIcon, PencilSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { AppUser } from '../../lib/accounts/policy';
import AccountMenu from '../auth/account-menu';
import './app-shell.css';

export default function AppShell({ children, user }: { children: React.ReactNode; user: AppUser }) {
  const pathname = usePathname();
  const vocabulary = pathname === '/tu-vung' || pathname.startsWith('/tu-vung/');
  const grammar = pathname === '/ngu-phap' || pathname.startsWith('/ngu-phap/');
  const ets = pathname === '/ets-2024' || pathname.startsWith('/ets-2024/');
  const etsId = pathname.split('/')[2];
  return <div className="learning-app app-shell">
    <a href="#main" className="skip-link">Đến nội dung chính</a>
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="English Space — Trang chủ"><span className="brand-symbol">e<span>.</span></span><span className="brand-caption" lang="en">SPACE</span></Link>
      <nav aria-label="Điều hướng chính">
        <Link className={`nav-item${pathname === '/' ? ' active' : ''}`} href="/" aria-current={pathname === '/' ? 'page' : undefined}><HomeIcon width={23} height={23} aria-hidden="true"/><span>Trang chủ</span></Link>
        <Link className={`nav-item${vocabulary ? ' active' : ''}`} href="/tu-vung" aria-current={vocabulary ? 'page' : undefined}><BookOpenIcon width={23} height={23} aria-hidden="true"/><span>Từ vựng</span></Link>
        <Link className={`nav-item${pathname === '/achievements' ? ' active' : ''}`} href="/achievements" aria-current={pathname === '/achievements' ? 'page' : undefined}><TrophyIcon width={23} height={23} aria-hidden="true"/><span>Thành tích</span></Link>
        <div className="nav-divider"/>
        <Link className={`nav-item${grammar ? ' active' : ''}`} href="/ngu-phap" aria-current={grammar ? 'page' : undefined}><PencilSquareIcon width={23} height={23} aria-hidden="true"/><span>Ngữ pháp</span></Link>
        <Link className={`nav-item${ets ? ' active' : ''}`} href="/ets-2024" aria-current={ets ? 'page' : undefined}><DocumentTextIcon width={23} height={23} aria-hidden="true"/><span>ETS 2024</span></Link>
      </nav>
    </aside>
    <div className="workspace">
      <header className={`topbar${pathname === "/" ? " home-topbar" : ""}${vocabulary ? " vocabulary-topbar" : ""}`}>
        {vocabulary ? <nav className="breadcrumb" aria-label="Đường dẫn">
          <Link href="/">Home</Link><span aria-hidden="true">/</span>
          {pathname === '/tu-vung' ? <strong aria-current="page">Từ vựng</strong> : <Link href="/tu-vung">Từ vựng</Link>}
        </nav> : grammar ? <nav className="breadcrumb" aria-label="Đường dẫn"><Link href="/">Home</Link><span aria-hidden="true">/</span>{pathname === '/ngu-phap' ? <strong aria-current="page">Ngữ Pháp</strong> : <Link href="/ngu-phap">Ngữ Pháp</Link>}</nav> : ets ? <nav className="breadcrumb" aria-label="Đường dẫn"><Link href="/">Home</Link><span aria-hidden="true">/</span>{etsId ? <><Link href="/ets-2024">ETS 2024</Link><span aria-hidden="true">/</span><Link href={`/ets-2024/${etsId}`}>Test {etsId.padStart(2, '0')}</Link>{pathname.endsWith('/practice') && <><span aria-hidden="true">/</span><strong aria-current="page">Luyện tập</strong></>}</> : <strong aria-current="page">ETS 2024</strong>}</nav> : pathname !== "/" && <span className="header-title">{pathname === "/achievements" ? "Thành tích" : pathname === "/admin/users" ? "Quản lý tài khoản" : "Home"}</span>}
        <div className="topbar-right"><AccountMenu key={pathname} user={user}/></div>
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
