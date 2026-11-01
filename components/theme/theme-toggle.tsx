"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  function toggleTheme() {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("english-space-theme", next); } catch { /* The toggle still works when storage is unavailable. */ }
  }

  return <button type="button" className={`theme-toggle ${className}`} onClick={toggleTheme} aria-label="Đổi giao diện sáng / tối" title="Đổi giao diện sáng / tối">
    <span className="theme-to-light"><SunIcon width={20} height={20} aria-hidden="true"/><span>Sáng</span></span>
    <span className="theme-to-dark"><MoonIcon width={20} height={20} aria-hidden="true"/><span>Tối</span></span>
  </button>;
}
