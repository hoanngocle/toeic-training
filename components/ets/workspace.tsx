'use client';
/* eslint-disable @next/next/no-img-element -- Source illustration dimensions are not present in the catalog; preserve native aspect ratios. */
import Link from 'next/link';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { EtsBlock, EtsResult, PublicEtsTest } from '../../lib/ets/types';
import { createDraft, draftKey, restoreDraft, submissionPayload } from './draft';
import type { Draft } from './draft';

function clock(ms: number) { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds % 3600 / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
function Blocks({ blocks }: { blocks: EtsBlock[] }) {
  return <div className="ets-blocks" lang="en">{blocks.map((block, index) => block.type === 'image' ? <figure key={index}><img src={block.src} alt={block.alt ?? 'Hình minh họa của câu hỏi'} loading="lazy"/>{block.text && <figcaption>{block.text}</figcaption>}</figure> : block.type === 'table' ? <div className="ets-tableWrap" key={index}><table>{block.text && <caption>{block.text}</caption>}<tbody>{block.rows?.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>)}</tbody></table></div> : <p key={index}>{block.text}</p>)}</div>;
}

function SubmitConfirmation({ blanks, cancel, submit }: { blanks: number; cancel: () => void; submit: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="ets-confirm" aria-labelledby="ets-confirm-title" onCancel={cancel}><div className="ets-panel"><h2 id="ets-confirm-title">Còn {blanks} câu chưa trả lời</h2><p>Các câu bỏ trống sẽ tính sai. Bạn muốn nộp bài?</p><div className="ets-confirmActions"><button autoFocus type="button" className="ets-button" onClick={cancel}>Tiếp tục làm</button><button type="button" className="ets-button ets-primary" onClick={submit}>Nộp bài</button></div></div></dialog>;
}

export default function EtsWorkspace({ userId, test, part }: { userId: string; test: PublicEtsTest; part: number }) {
  const parts = part ? test.parts.filter(p => p.number === part) : test.parts;
  const groups = parts.flatMap(p => p.groups.map(group => ({ ...group, part: p.number })));
  const questions = groups.flatMap(group => group.questions);
  const key = draftKey(userId, test.id, part);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [groupIndex, setGroupIndex] = useState(0);
  const [result, setResult] = useState<EtsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const inFlight = useRef(false);
  const automatic = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const title = `${test.title}${part ? ` · Part ${part}` : ' · Trọn đề'}`;
  const active = groups[groupIndex];
  const audio = part ? parts[0]?.audio : { src: test.audioSrc };
  const expired = Boolean(draft?.deadline && now >= draft.deadline);
  const locked = busy || Boolean(draft?.pending) || expired || Boolean(result);

  const save = useCallback((next: Draft) => {
    setDraft(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(''); }
    catch { setStorageError('Trình duyệt không lưu được bản nháp. Hãy giữ trang này mở để tiếp tục bài làm.'); }
  }, [key]);

  useEffect(() => {
    // Read only after hydration; each route/account gets an independent component.
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(key);
        const saved = restoreDraft(raw);
        if (raw && !saved) setError('Bản nháp bị lỗi. Bắt đầu lại để tạo lượt làm mới.');
        setDraft(saved);
      } catch { setStorageError('Không đọc được bản nháp trong trình duyệt.'); }
      setNow(Date.now()); setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);

  useEffect(() => {
    if (!draft || result) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [draft, result]);

  useEffect(() => {
    if (!draft?.submitted) return;
    const controller = new AbortController();
    fetch(`/api/ets?test=${test.id}&part=${part}`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Không thể tải kết quả.');
      const saved = (data.sessions as EtsResult[]).find(value => value.id === draft.submitted);
      if (!saved) throw new Error('Không tìm thấy kết quả đã lưu. Vui lòng xem lịch sử đề.');
      if (!controller.signal.aborted) setResult(saved);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [draft?.submitted, part, test.id]);

  async function submit() {
    if (!draft || draft.submitted || inFlight.current) return;
    automatic.current = draft.id;
    inFlight.current = true; setBusy(true); setError(''); setConfirm(false);
    const pending = submissionPayload(draft, test.id, part, Date.now());
    const frozen = { ...draft, pending };
    save(frozen);
    audioRef.current?.pause();
    try {
      const response = await fetch('/api/ets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Không thể nộp bài.');
      setResult(data as EtsResult);
      save({ ...frozen, submitted: data.id });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể nộp bài. Hãy thử lại.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const automaticSubmit = useEffectEvent(() => { void submit(); });

  useEffect(() => {
    if (!ready || !draft || draft.submitted || result || automatic.current === draft.id) return;
    if (draft.pending || (draft.deadline !== null && now >= draft.deadline)) {
      const timer = setTimeout(() => { automatic.current = draft.id; automaticSubmit(); }, 0);
      return () => clearTimeout(timer);
    }
  }, [ready, draft, now, result]);

  function start() {
    automatic.current = null; setError(''); setResult(null); setConfirm(false); setGroupIndex(0);
    const time = Date.now(); setNow(time); save(createDraft(crypto.randomUUID(), part, time));
  }
  function jump(index: number) {
    setGroupIndex(index);
    requestAnimationFrame(() => document.getElementById('ets-group-heading')?.focus());
  }
  function requestSubmit() {
    if (questions.some(question => !draft?.answers[question.number])) setConfirm(true);
    else void submit();
  }
  if (!ready) return <div className="ets-page" role="status">Đang khôi phục bài làm…</div>;
  if (!draft) return <div className="ets-page"><Link className="ets-back" href={`/ets-2024/${test.id}`}>← Chọn chế độ luyện</Link><header className="ets-hero"><p className="ets-eyebrow">ETS 2024</p><h1>{title}</h1><p>{questions.length} câu · {part ? 'Không giới hạn thời gian' : '120 phút, tự nộp khi hết giờ'}</p></header><section className="ets-panel"><h2>Sẵn sàng luyện tập?</h2><p>Bài làm được lưu trên trình duyệt theo tài khoản. Câu bỏ trống tính sai. Audio phát khi bạn nhấn nút nghe.</p>{error && <p role="alert">{error}</p>}<button type="button" className="ets-button ets-primary" onClick={start}>Bắt đầu {part ? `Part ${part}` : 'làm đề'}</button></section></div>;
  if (result) return <div className="ets-page"><Link className="ets-back" href={`/ets-2024/${test.id}`}>← Về đề & lịch sử</Link><header className="ets-hero"><p className="ets-eyebrow">KẾT QUẢ · {title}</p><h1>{result.score}<span className="ets-scoreTotal"> / {result.total} câu đúng</span></h1><p>Thời gian làm bài {clock(result.durationMs)} · Câu bỏ trống tính sai.</p><button type="button" className="ets-button ets-primary" onClick={start}>Làm lại</button></header><div className="ets-review">{groups.map(group => <section className="ets-panel" key={`${group.part}:${group.id}`}><h2>Part {group.part} · Câu {group.questions.map(q => q.number).join(', ')}</h2><Blocks blocks={group.blocks}/>{group.questions.map(question => { const answer = result.results.find(value => value.number === question.number); return <div className="ets-answerReview" key={question.number}><h3 lang="en">{question.number}. {question.prompt}</h3><p className={answer?.correct ? 'ets-correct' : 'ets-incorrect'}>{answer?.correct ? 'Đúng' : 'Sai'} · Bạn chọn {answer?.selected || 'Bỏ trống'} · Đáp án {answer?.expected}</p>{question.choices.some(choice => choice.text) && <ul lang="en">{question.choices.map(choice => <li key={choice.label}>{choice.label}. {choice.text}</li>)}</ul>}</div>; })}{result.transcripts?.[group.id] && <details className="ets-transcript"><summary>Transcript</summary><p lang="en">{result.transcripts[group.id]}</p></details>}</section>)}</div></div>;
  return <div className="ets-page ets-practice"><Link className="ets-back" href={`/ets-2024/${test.id}`}>← Về đề · bản nháp được giữ lại</Link><header className="ets-workHeader"><div><p className="ets-eyebrow">ETS 2024</p><h1>{title}</h1></div><div className={`ets-timer${expired ? ' ets-incorrect' : ''}`} role="timer" aria-label={part ? 'Thời gian đã làm' : 'Thời gian còn lại'}><span>{part ? 'Đã làm' : 'Còn lại'}</span><strong>{clock(draft.deadline === null ? now - draft.startedAt : draft.deadline - now)}</strong></div></header>{storageError && <p role="alert" className="ets-notice">{storageError}</p>}{error && <div role="alert" className="ets-notice"><p>{error}</p>{draft.pending && <button className="ets-button" type="button" onClick={() => void submit()} disabled={busy}>Thử nộp lại</button>}</div>}{(expired || draft.pending || draft.submitted) && <p role="status" className="ets-notice">{busy ? 'Đang nộp bài…' : draft.submitted ? 'Đang tải kết quả đã lưu…' : 'Bài làm đã khóa để nộp. Các lựa chọn đã được giữ nguyên.'}</p>}{audio?.src && <div className="ets-audio"><span>{part ? `Audio Part ${part}` : 'Audio Listening toàn đề'}</span><audio ref={audioRef} controls preload="none" src={audio.src} onLoadedMetadata={event => { if (audio.start !== undefined) event.currentTarget.currentTime = audio.start; }} onPlay={event => { if (audio.start !== undefined && event.currentTarget.currentTime < audio.start) event.currentTarget.currentTime = audio.start; }} onTimeUpdate={event => { if (audio.end !== undefined && event.currentTarget.currentTime >= audio.end) { event.currentTarget.pause(); event.currentTarget.currentTime = audio.start ?? 0; } }} aria-label={part ? `Audio Part ${part}` : 'Audio Listening toàn đề'}/></div>}<div className="ets-workGrid"><div className="ets-groupColumn">{active && <section className="ets-panel"><h2 id="ets-group-heading" tabIndex={-1}>Part {active.part} · Câu {active.questions.map(q => q.number).join(', ')}</h2><Blocks blocks={active.blocks}/>{active.questions.map(question => <fieldset className="ets-question" key={question.number} disabled={locked}><legend><span lang="en">{question.number}. {question.prompt}</span></legend><div className="ets-choices">{question.choices.map(choice => <label key={choice.label} className={draft.answers[question.number] === choice.label ? 'ets-selected' : ''}><input type="radio" name={`question-${question.number}`} value={choice.label} checked={draft.answers[question.number] === choice.label} onChange={() => save({ ...draft, answers: { ...draft.answers, [question.number]: choice.label } })}/><strong>{choice.label}</strong>{active.part > 2 && <span lang="en">{choice.text}</span>}</label>)}</div><button type="button" className="ets-mark" aria-pressed={draft.marked.includes(question.number)} onClick={() => save({ ...draft, marked: draft.marked.includes(question.number) ? draft.marked.filter(n => n !== question.number) : [...draft.marked, question.number] })}>{draft.marked.includes(question.number) ? '★ Đã đánh dấu' : '☆ Đánh dấu xem lại'}</button></fieldset>)}</section>}<nav className="ets-stepNav" aria-label="Chuyển nhóm câu hỏi"><button type="button" className="ets-button" disabled={groupIndex === 0} onClick={() => jump(groupIndex - 1)}>← Nhóm trước</button><span>{groupIndex + 1} / {groups.length}</span><button type="button" className="ets-button" disabled={groupIndex === groups.length - 1} onClick={() => jump(groupIndex + 1)}>Nhóm tiếp →</button></nav></div><aside className="ets-answerSheet"><h2>Phiếu trả lời</h2><p>{questions.filter(q => draft.answers[q.number]).length}/{questions.length} câu đã chọn</p><p className="ets-legend">● Đã chọn · ★ Cần xem lại</p><div className="ets-numberGrid">{groups.map((group, index) => group.questions.map(question => <button type="button" key={question.number} className={`${draft.answers[question.number] ? 'ets-filled ' : ''}${draft.marked.includes(question.number) ? 'ets-flagged' : ''}`} aria-label={`Câu ${question.number}${draft.answers[question.number] ? ', đã chọn' : ', chưa chọn'}${draft.marked.includes(question.number) ? ', đã đánh dấu' : ''}`} aria-current={index === groupIndex ? 'step' : undefined} onClick={() => jump(index)}>{question.number}{draft.marked.includes(question.number) && <span aria-hidden="true">★</span>}</button>))}</div><button className="ets-button ets-primary ets-submit" type="button" disabled={busy || Boolean(draft.submitted)} onClick={() => draft.pending ? void submit() : requestSubmit()}>{busy ? 'Đang nộp…' : draft.pending ? 'Thử nộp lại' : 'Nộp bài'}</button></aside></div>{confirm && <SubmitConfirmation blanks={questions.filter(q => !draft.answers[q.number]).length} cancel={() => setConfirm(false)} submit={() => void submit()}/>}</div>;
}
