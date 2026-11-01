'use client';

import './account-menu.css';
import Link from 'next/link';
import type { AppUser } from '../../lib/accounts/policy';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

export default function AccountMenu({user}: {user: AppUser}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  return <div className="account-menu" ref={container}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
    <button ref={trigger} type="button" className="avatar account-avatar" aria-label="Tài khoản" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{user.email.slice(0,1).toUpperCase() || 'U'}</button>
    <div id={id} className="account-dropdown" hidden={!open}>
      {user.role==='admin' && <Link className="account-logout" href="/admin/users">Quản lý tài khoản</Link>}
      <form action="/api/auth/logout" method="post">
        <button type="submit" className="account-logout"><ArrowRightStartOnRectangleIcon width={18} height={18} aria-hidden="true" />Đăng xuất</button>
      </form>
    </div>
  </div>;
}
