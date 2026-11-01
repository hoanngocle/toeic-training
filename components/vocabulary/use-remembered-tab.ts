"use client";

import { useCallback, useState, useSyncExternalStore } from 'react';

const changedEvent = 'vocabulary-tab-changed';
const serverSnapshot = () => '';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(changedEvent, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(changedEvent, onChange);
  };
}

export function useRememberedTab<T extends string>(key: string, options: readonly T[], fallback: T) {
  // Keep tab switching functional even when browser storage is unavailable.
  const [local, setLocal] = useState<{ key: string; value: T } | null>(null);
  const read = useCallback(() => {
    try { return window.localStorage.getItem(key) ?? ''; }
    catch { return ''; }
  }, [key]);
  const saved = useSyncExternalStore(subscribe, read, serverSnapshot);
  const candidate = local?.key === key ? local.value : saved;
  const selected = options.includes(candidate as T) ? candidate as T : fallback;

  function select(value: T) {
    if (!options.includes(value)) return;
    setLocal({ key, value });
    try { window.localStorage.setItem(key, value); }
    catch { /* The current tab still works without persistent storage. */ }
    window.dispatchEvent(new Event(changedEvent));
  }

  return [selected, select] as const;
}
