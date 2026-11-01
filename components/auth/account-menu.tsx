'use client';

import './account-menu.css';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

export default function AccountMenu() {
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
    <button ref={trigger} type="button" className="avatar account-avatar" aria-label="Tài khoản" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>N</button>
    <div id={id} className="account-dropdown" hidden={!open}>
      <form action="/api/auth/logout" method="post">
        <button type="submit" className="account-logout"><ArrowRightStartOnRectangleIcon width={18} height={18} aria-hidden="true" />Đăng xuất</button>
      </form>
    </div>
  </div>;
}
