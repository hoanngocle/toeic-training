'use client';

import { useEffect, useState } from 'react';
import type { Lesson } from '../catalog';
import type { Progress, SessionSummary } from '../../../lib/learning/types';
import { withWordFamilies } from '../../../lib/learning/practice';
import { LoadingStatus } from '../../ui/loading';

export default function LessonHistory({ lesson, progress, revision, onRefresh }: {
  lesson: Lesson; progress?: Progress[]; revision: number; onRefresh: () => void;
}) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/learning?lesson=${encodeURIComponent(lesson.slug)}&view=history`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Chưa kết nối được lịch sử học.');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không đọc được lịch sử học.');
        return data.sessions as SessionSummary[];
      })
      .then(data => { if (!controller.signal.aborted) { setSessions(data); setError(''); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không đọc được lịch sử học.'); });
    return () => controller.abort();
  }, [lesson.slug, revision]);

  const words = withWordFamilies(lesson.words, lesson.wordFamilies);
  return <section className="study-panel">
    <div className="study-toolbar"><h2>Lịch sử học bài</h2><button className="study-button" onClick={onRefresh}>Cập nhật</button></div>
    {error ? <p className="study-error" role="alert">{error} <button className="study-button" onClick={onRefresh}>Tải lại lịch sử</button></p>
      : !sessions ? <LoadingStatus label="Đang tải lịch sử…" />
      : !sessions.length ? <div className="study-complete"><h3>Chưa có kết quả</h3><p>Hoàn thành một câu Writing hoặc một bài Test để xem kết quả tại đây.</p></div>
      : <div className="study-history">{sessions.map(session => <div className="study-historyEntry" key={session.id}>
        <span className="study-historyHeading"><span><strong>{session.mode === 'test' ? 'Test' : 'Writing'}</strong>{session.includeWordFamilies ? ' + Word Families' : ''}</span><b className="study-historyScore">{session.score}/{session.total} đúng</b></span>
        <span>{new Date(session.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · {Math.ceil(session.durationMs / 1000)} giây</span>
      </div>)}</div>}
    {progress && <details className="study-wordProgress"><summary>Tiến độ từng từ ({progress.length} từ đã luyện)</summary><p className="study-hint">Số lần trả lời đúng (+) và sai (−) của từng từ.</p><ul>{progress.map(item => <li key={item.wordId}>
      <strong>{words.find(word => word.id === item.wordId)?.spokenText}</strong><span className="study-wordCounts"><b className="study-wordCorrect" aria-label={`${item.correct} lần đúng`}>+{item.correct}</b><b className="study-wordIncorrect" aria-label={`${item.incorrect} lần sai`}>−{item.incorrect}</b></span>
    </li>)}</ul></details>}
  </section>;
}
