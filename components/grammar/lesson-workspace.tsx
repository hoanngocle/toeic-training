'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { PublicBookUnit } from '../../lib/essential/types';
import { ExerciseUnit } from '../vocabulary/essential/section';

export default function GrammarWorkspace({ theory, exercises }: { theory: ReactNode; exercises: PublicBookUnit[] }) {
  const [mode, setMode] = useState<'theory' | 'practice'>('theory');
  const [selected, setSelected] = useState(exercises[0]?.id ?? '');
  function choose(next: 'theory' | 'practice') {
    window.dispatchEvent(new Event('vocabulary-stop-audio'));
    setMode(next);
  }
  return <>
    <div className="grammar-modes" role="group" aria-label="Chế độ học">
      <button type="button" aria-pressed={mode === 'theory'} onClick={() => choose('theory')}>Lý thuyết & ví dụ</button>
      <button type="button" aria-pressed={mode === 'practice'} onClick={() => choose('practice')}>Luyện tập{exercises.length ? ` · ${exercises.reduce((n, u) => n + u.questions.length, 0)} câu` : ''}</button>
    </div>
    <div hidden={mode !== 'theory'}>{theory}</div>
    <div hidden={mode !== 'practice'}>
      {exercises.length ? <>
        <div className="grammar-practiceHeading"><label htmlFor="grammar-exercise">Chọn ví dụ để luyện</label><select id="grammar-exercise" value={selected} onChange={event => { window.dispatchEvent(new Event('vocabulary-stop-audio')); setSelected(event.target.value); }}>{exercises.map((unit, i) => <option value={unit.id} key={unit.id}>{i + 1}. {unit.title}</option>)}</select></div>
        {exercises.map(unit => <section key={unit.id} className="study-panel essential-section" aria-label={unit.title} hidden={selected !== unit.id}><ExerciseUnit unit={unit} active={mode === 'practice' && selected === unit.id} /></section>)}
      </> : <div className="grammar-empty"><h2>Học qua lý thuyết và ví dụ</h2><p>Phần này trong tài liệu là hướng dẫn và ví dụ minh họa. Chưa có bộ câu hỏi kèm đủ ngữ cảnh và đáp án để chấm bài.</p><button className="study-button" type="button" onClick={() => choose('theory')}>Xem lý thuyết & ví dụ</button></div>}
    </div>
  </>;
}
