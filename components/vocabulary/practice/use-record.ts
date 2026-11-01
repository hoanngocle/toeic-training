"use client";
import { useRef, useState } from 'react';
import type { SaveRequest, Session } from '../../../lib/learning/types';

export function useRecord(onComplete: (result: Session) => void, onSaved: () => void) {
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<SaveRequest | null>(null);
  const [error, setError] = useState('');
  async function submit(payload: SaveRequest) {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/learning', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Chưa kết nối được dữ liệu học. Giữ trang này và thử lưu lại.");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chưa lưu được kết quả.');
      setFailed(null);
      onComplete(result);
      onSaved();
    } catch (error) {
      setFailed(payload);
      setError(error instanceof Error ? error.message : 'Chưa lưu được kết quả.');
    } finally { lock.current = false; setSaving(false); }
  }
  return {submit, saving, error, blocked:saving || !!failed, retry:() => {if (failed) void submit(failed);}};
}
export function elapsed(start: number) { return Math.min(86400000, Math.max(0, Date.now()-start)); }
