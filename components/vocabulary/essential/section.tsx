"use client";
import { useRouter } from "next/navigation";
import { RewardPopup } from "../../progression/reward-popup";
import { RewardNotice } from "../../progression/progression-card";

import { Fragment, useEffect, useId, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ExerciseRequest, ExerciseResult, PublicBookSection, PublicBookUnit } from '../../../lib/essential/types';
import { exerciseReducer, initialExercise } from './exercise-state';
import { createExerciseTimer, exerciseDuration, setTimerActive } from './timer';
import BookPages from './pages';
import SyntheticSpeech from './speech';
import OriginalAudio from './original-audio';
import { useRememberedTab } from '../use-remembered-tab';
import ContextPassage from './context-passage';
import WordFamilies from './word-families';
import './essential.css';

function QuestionPassage({ unit, questionId, visibleIds }: { unit?: PublicBookUnit; questionId: string; visibleIds: string[] }) {
  const passage = unit?.questionPassages?.find(passage => passage.questionIds.find(id => visibleIds.includes(id)) === questionId);
  if (!passage) return null;
  return <article className="essential-readingPassage" aria-label={`Đoạn văn câu ${passage.questionIds.join(', ')}`}>
    <span className="study-eyebrow">ĐOẠN VĂN · CÂU {passage.questionIds[0]}–{passage.questionIds.at(-1)}</span>
    <div lang="en">{passage.text.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph.split(/(\[\d+\])/g).map((part, index) => /^\[\d+\]$/.test(part) ? <strong key={index}>____ {part} ____</strong> : part)}</p>)}</div>
  </article>;
}

function ResultReview({ result, unit }: { result: ExerciseResult; unit?: PublicBookUnit }) {
  return <ol className="study-review">{result.results.map(answer => <li key={answer.questionId} className={answer.correct ? 'is-correct' : 'is-wrong'}>
    <QuestionPassage unit={unit} questionId={answer.questionId} visibleIds={result.results.map(answer => answer.questionId)} />
    <div><strong>{answer.label}</strong><span className="study-resultTag">{answer.correct ? 'Đúng' : 'Cần ôn lại'}</span></div>
    {answer.prompt && <p className="essential-readingPrompt" lang="en">{answer.prompt}</p>}
    <p>Bạn trả lời: <span>{answer.answer || '(Bỏ trống)'}{answer.answerText ? ` · ${answer.answerText}` : ''}</span></p>
    <p>Đáp án đúng: <strong>{answer.expected}{answer.expectedText ? ` · ${answer.expectedText}` : ''}</strong></p>
    {answer.explanation && <div className="essential-explanation"><strong>Giải thích</strong><p>{answer.explanation}</p></div>}
    {answer.sourceNote && <p className="study-hint">Lưu ý về sách gốc: {answer.sourceNote}</p>}
  </li>)}</ol>;
}

function ReferenceUnit({ unit }: { unit: PublicBookUnit }) {
  if (unit.wordFamilies) return <WordFamilies rows={unit.wordFamilies} />;
  return <div className="essential-unit">
    <div className="essential-unitHeading"><h3>{unit.title}</h3></div>
    {unit.note && <p className="study-hint essential-sourceNote">{unit.note}</p>}
    <BookPages pages={unit.pages} />
  </div>;
}

function ExerciseUnit({ unit, active }: { unit: PublicBookUnit; active: boolean }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(exerciseReducer, undefined, initialExercise);
  const [history, setHistory] = useState<ExerciseResult[]>([]);
  const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [historyVersion, setHistoryVersion] = useState(0);
  const [completedAnswers, setCompletedAnswers] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const timer = useRef(createExerciseTimer());
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const questions = unit.questions.filter(question => !state.questionIds || state.questionIds.includes(question.id));
  const isReading = unit.questions.every(question => question.prompt && question.choiceTexts);
  const answered = questions.filter(question => state.answers[question.id]?.trim()).length;
  const blocked = state.saving || !!state.pending;
  const wrong = state.result?.results.filter(answer => !answer.correct).map(answer => answer.questionId) ?? [];

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    async function load() {
      setHistoryStatus('loading');
      try {
        const response = await fetch(`/api/essential?unit=${encodeURIComponent(unit.id)}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('history');
        const data = await response.json();
        if (!Array.isArray(data.sessions)) throw new Error('history');
        if (!controller.signal.aborted) { setHistory(data.sessions); setHistoryStatus('ready'); }
      } catch {
        if (!controller.signal.aborted) setHistoryStatus('error');
      }
    }
    void load();
    return () => controller.abort();
  }, [active, unit.id, historyVersion]);

  useEffect(() => {
    timer.current = setTimerActive(timer.current, active && !state.result && !state.pending);
    return () => { timer.current = setTimerActive(timer.current, false); };
  }, [active, state.result, state.pending]);

  useEffect(() => {
    if (state.result) resultHeading.current?.focus();
  }, [state.result]);

  useEffect(() => {
    if (!state.pending) return;
    const protectDraft = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [state.pending]);

  async function save(payload: ExerciseRequest) {
    if (lock.current) return;
    lock.current = true;
    const request = state.pending ?? payload;
    dispatch({ type: 'submit', payload: request });
    try {
      const response = await fetch('/api/essential', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Chưa kết nối được máy chủ. Câu trả lời vẫn được giữ tại đây.');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chưa lưu được bài làm.');
      dispatch({ type: 'success', result });
      setHistoryVersion(value => value + 1);
      router.refresh();
    } catch (error) {
      dispatch({ type: 'failure', error: error instanceof Error ? error.message : 'Chưa lưu được bài làm.' });
    } finally { lock.current = false; }
  }

  function submit() {
    if (blocked || answered !== questions.length || !questions.length) return;
    const answers = Object.fromEntries(questions.map(question => [question.id, state.answers[question.id].trim()]));
    void save({ id: crypto.randomUUID(), unitId: unit.id, durationMs: exerciseDuration(timer.current), answers, ...(state.retryOf ? { retryOf: state.retryOf } : {}) });
  }

  function restart(ids?: string[]) {
    if (blocked) return;
    setCompletedAnswers(ids ? Object.fromEntries(Object.entries({ ...completedAnswers, ...state.answers }).filter(([id]) => !ids.includes(id))) : {});
    dispatch({ type: 'restart', ids });
    timer.current = setTimerActive(createExerciseTimer(), active);
  }

  return <div className="essential-unit">
    {state.result && <RewardPopup result={state.result}/>}
    {!unit.passage && !unit.questionPassages && <div className="essential-unitHeading"><h3>{unit.title}</h3></div>}
    {unit.note && <p className="study-hint essential-sourceNote">{unit.note}</p>}
    {unit.transcript && !unit.audioSrc && <SyntheticSpeech text={unit.transcript} active={active} />}
    {!unit.passage && !isReading && !unit.audioSrc && <BookPages pages={unit.pages} />}
    {unit.listeningImage && <figure className="essential-listeningPhoto">
      {/* This is the exercise photograph, without the surrounding scanned page. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={unit.listeningImage.src} alt={unit.listeningImage.alt} />
    </figure>}
    {unit.readingPassage && <article className="essential-readingPassage" aria-label="Đoạn đọc">
      <span className="study-eyebrow">ĐOẠN ĐỌC</span>
      <div lang="en">{unit.readingPassage.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    </article>}
    <div className={`essential-answerArea${unit.passage ? ' essential-contextAnswerArea' : ''}`}>
      {state.result ? <>
        <div className="study-complete"><span className="study-eyebrow">KẾT QUẢ ĐÃ LƯU</span>
          <h3 ref={resultHeading} tabIndex={-1}>{state.result.score} / {state.result.total} câu đúng</h3><RewardNotice result={state.result}/>
          <p>{Math.round(state.result.score / state.result.total * 100)}% · {Math.ceil(state.result.durationMs / 1000)} giây</p>
          <div className="study-rating">{!!wrong.length && <button type="button" className="study-button primary" onClick={() => restart(wrong)}>Làm lại {wrong.length} câu sai</button>}
            <button type="button" className="study-button" onClick={() => restart()}>Làm lại toàn bộ</button></div>
        </div>
        {unit.passage && <ContextPassage unit={unit} answers={{ ...completedAnswers, ...state.answers }} questionIds={questions.map(q => q.id)} disabled={false} result={state.result} onAnswer={() => {}} />}
        <ResultReview result={state.result} unit={unit} />
        {!unit.passage && !!unit.answerKeyPages?.length && <details className="essential-transcript"><summary>Xem đáp án gốc trong sách</summary><BookPages pages={unit.answerKeyPages} /></details>}
      </> : <form onSubmit={event => { event.preventDefault(); submit(); }}>
        <div className="study-counter"><strong>{state.questionIds ? 'Ôn lại câu sai' : 'Phiếu trả lời'}</strong><span>Đã trả lời {answered} / {questions.length}</span></div>
        {!unit.audioSrc && !unit.questionPassages && <p className="study-hint">{isReading ? 'Chọn một đáp án cho mỗi câu. Đáp án đúng và giải thích sẽ hiện ngay sau khi nộp bài.' : unit.passage ? 'Điền từ trực tiếp vào chỗ trống trong đoạn văn. Dùng Tab để chuyển ô. Kết quả hiện sau khi nộp bài.' : 'Đọc đề và lựa chọn trên trang sách, rồi điền đáp án bên dưới. Kết quả hiện sau khi nộp bài.'}</p>}
        {unit.passage ? <ContextPassage unit={unit} answers={{ ...completedAnswers, ...state.answers }} questionIds={questions.map(q => q.id)} disabled={blocked} onAnswer={(id, value) => dispatch({ type: 'answer', id, value })} /> : <div className={`essential-questions${isReading ? ' essential-readingQuestions' : ''}${unit.questionPassages ? ' essential-reviewQuestions' : ''}`}>{questions.map(question => <Fragment key={question.id}><QuestionPassage unit={unit} questionId={question.id} visibleIds={questions.map(question => question.id)} /><fieldset className="essential-question" disabled={blocked}>
          <legend>{question.label}{question.prompt && <span className="essential-readingPrompt" lang="en">{question.prompt}</span>}</legend>
          {question.choices?.length ? <div className="essential-choices">{question.choices.map(choice => <label key={choice} className={state.answers[question.id] === choice ? 'selected' : ''}>
            <input type="radio" name={`${unit.id}-${question.id}`} value={choice} checked={state.answers[question.id] === choice} onChange={() => dispatch({ type: 'answer', id: question.id, value: choice })} required />
            {question.choiceTexts ? <><strong>{choice}</strong><span lang="en">{question.choiceTexts[choice]}</span></> : <span>{choice}</span>}
          </label>)}</div> : <label className="essential-textAnswer"><span>Đáp án cho {question.label}</span><input type="text" lang="en" autoComplete="off" spellCheck={false} required maxLength={200} value={state.answers[question.id] ?? ''} onChange={event => dispatch({ type: 'answer', id: question.id, value: event.target.value })} /></label>}
        </fieldset></Fragment>)}</div>}
        <button type="submit" className="study-button primary study-submit" disabled={blocked || answered !== questions.length || !questions.length}>{state.saving ? 'Đang chấm và lưu…' : `Nộp bài · ${answered}/${questions.length}`}</button>
        {!!state.questionIds && <button type="button" className="study-button essential-reset" disabled={blocked} onClick={() => restart()}>Làm lại toàn bộ</button>}
      </form>}
      {state.error && <div className="study-save" role="alert"><p>{state.error} Câu trả lời được giữ nguyên; hãy giữ trang này để thử lưu lại.</p><button type="button" className="study-button" disabled={state.saving} onClick={() => { if (state.pending) void save(state.pending); }}>Thử lưu lại</button></div>}
    </div>
    {unit.transcript && <details className="essential-transcript"><summary>Script</summary>
      {unit.transcript && <p className="essential-transcriptText" lang="en">{unit.transcript}</p>}
    </details>}
    <details className="study-history essential-history"><summary>Lịch sử bài làm {historyStatus === 'ready' ? `(${history.length})` : ''}</summary>
      {historyStatus === 'loading' && <p className="study-hint" role="status">Đang tải lịch sử…</p>}
      {historyStatus === 'error' && <p className="study-error">Chưa tải được lịch sử. <button type="button" className="study-button" onClick={() => setHistoryVersion(value => value + 1)}>Tải lại</button></p>}
      {historyStatus === 'ready' && !history.length && <p className="study-hint">Chưa có bài làm đã lưu cho phần này.</p>}
      {history.map(session => <details key={session.id}><summary><span>{session.score} / {session.total} câu đúng</span><span>{new Date(session.createdAt).toLocaleString('vi-VN')} · {Math.ceil(session.durationMs / 1000)} giây</span></summary><ResultReview result={session} unit={unit} /></details>)}
    </details>
  </div>;
}

export default function EssentialSection({ section, active: sectionActive = true, storageKey }: { section: PublicBookSection; active?: boolean; storageKey: string }) {
  const [selected, setSelected] = useRememberedTab(storageKey, section.units.map(unit => unit.id), section.units[0]?.id ?? '');
  const id = useId();
  const current = section.units.some(unit => unit.id === selected) ? selected : section.units[0]?.id;
  const audioSrc = section.units.find(unit => unit.audioSrc)?.audioSrc;
  function choose(next: string) { window.dispatchEvent(new Event('vocabulary-stop-audio')); setSelected(next); }
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % section.units.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + section.units.length) % section.units.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = section.units.length - 1;
    else return;
    event.preventDefault();
    choose(section.units[next].id);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }
  return <section className={section.units.some(unit => unit.wordFamilies) ? "vocab-detailContent essential-section" : "study-panel essential-section"} aria-label={section.title}>
    {!section.units.some(unit => unit.passage || unit.wordFamilies) && <div className="study-toolbar"><h2>{section.title}</h2><span className="study-eyebrow">600 ESSENTIAL WORDS FOR THE TOEIC</span></div>}
    {audioSrc && <OriginalAudio key={audioSrc} src={audioSrc} active={sectionActive} />}
    {section.units.length > 1 && <div className="study-tabs essential-tabs" role="tablist" aria-label={section.title}>{section.units.map((unit, index) => <button key={unit.id} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={current === unit.id} tabIndex={current === unit.id ? 0 : -1} onKeyDown={event => onTabKey(event, index)} onClick={() => choose(unit.id)}>{unit.title}</button>)}</div>}
    {section.units.map((unit, index) => <div key={unit.id} id={`${id}-panel-${index}`} role={section.units.length > 1 ? 'tabpanel' : undefined} aria-labelledby={section.units.length > 1 ? `${id}-tab-${index}` : undefined} hidden={current !== unit.id}>
      {unit.questions.length ? <ExerciseUnit unit={unit} active={sectionActive && current === unit.id} /> : <ReferenceUnit unit={unit} />}
    </div>)}
    {!section.units.length && <p className="study-hint">Phần này chưa có bài tập.</p>}
  </section>;
}
