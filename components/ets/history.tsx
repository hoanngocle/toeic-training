'use client';
import { useEffect, useState } from 'react';
import type { EtsResult } from '../../lib/ets/types';
export default function EtsHistory({ testId }: { testId: number }) {
  const [sessions, setSessions] = useState<EtsResult[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(Array.from({ length: 8 }, (_, part) => fetch(`/api/ets?test=${testId}&part=${part}`, { signal: controller.signal, cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Không thể tải lịch sử.'); return data.sessions as EtsResult[]; })))
      .then(values => { setSessions(values.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setLoaded(true); })
      .catch(reason => { if (!controller.signal.aborted) { setError(reason.message); setLoaded(true); } });
    return () => controller.abort();
  }, [testId]);
  return <section className="ets-history" aria-labelledby="ets-history-title"><h2 id="ets-history-title">Lịch sử làm bài</h2>{error ? <p role="alert">{error}</p> : !loaded ? <p>Đang tải lịch sử…</p> : !sessions.length ? <p className="ets-muted">Chưa có lượt làm. Kết quả sẽ được lưu theo tài khoản của bạn.</p> : <div className="ets-historyList">{sessions.map(session => <details key={session.id}><summary><span>{session.part ? `Part ${session.part}` : 'Trọn đề'} · {new Date(session.createdAt).toLocaleString('vi-VN')}</span><strong>{session.score}/{session.total}</strong></summary><p>{Math.round(session.durationMs / 60000)} phút · Câu bỏ trống tính sai</p><div className="ets-resultGrid">{session.results.map(result => <div key={result.number} className={result.correct ? 'ets-correct' : 'ets-incorrect'}>Câu {result.number}: {result.selected || 'Bỏ trống'} → {result.expected}</div>)}</div></details>)}</div>}</section>;
}
