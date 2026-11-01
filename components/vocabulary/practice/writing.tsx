"use client";
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Lesson } from '../catalog';
import type { Direction } from '../../../lib/learning/practice';
import type { Session } from '../../../lib/learning/types';
import { DirectionPicker, SaveNotice } from './shared';
import { elapsed, useRecord } from './use-record';

export default function Writing({lesson,onSaved}: {lesson:Lesson;onSaved:()=>void}) {
  const [direction,setDirection]=useState<Direction>('en-vi');
  const [queue,setQueue]=useState(lesson.words);
  const [position,setPosition]=useState(0);
  const [answer,setAnswer]=useState('');
  const [result,setResult]=useState<Session|null>(null);
  const [wrong,setWrong]=useState<number[]>([]);
  const [correct,setCorrect]=useState(0);
  const [done,setDone]=useState(false);
  const [started,setStarted]=useState(0);
  const word=queue[position];
  const record=useRecord(session=>{
    setResult(session);
    if(session.results[0].correct) setCorrect(value=>value+1);
    else setWrong(value=>[...value,session.results[0].wordId]);
  },onSaved);
  function reset(nextDirection:Direction, ids?:number[]) {
    setDirection(nextDirection);setQueue(ids?lesson.words.filter(word=>ids.includes(word.id)):lesson.words);
    setPosition(0);setAnswer('');setResult(null);setWrong([]);setCorrect(0);setDone(false);setStarted(0);
  }
  function check(event:FormEvent) {
    event.preventDefault();
    if(!answer.trim()||result||record.blocked)return;
    void record.submit({id:crypto.randomUUID(),lesson:lesson.slug,mode:'writing',durationMs:started?elapsed(started):0,answers:[{wordId:word.id,direction,answer}]});
  }
  function next() {
    if(position===queue.length-1){setDone(true);return;}
    setPosition(position+1);setAnswer('');setResult(null);setStarted(0);
  }
  return <section className="study-panel" aria-label="Writing">
    <div className="study-toolbar"><DirectionPicker value={direction} disabled={record.blocked} onChange={value=>reset(value)}/></div>
    {done?<div className="study-complete"><span className="study-eyebrow">HOÀN THÀNH WRITING</span><h2>{correct} / {queue.length} câu đúng</h2><p>{wrong.length?`${wrong.length} từ cần luyện thêm.`:'Bạn đã trả lời đúng tất cả các từ trong lượt này.'}</p><div className="study-rating">{!!wrong.length&&<button className="study-button primary" onClick={()=>reset(direction,wrong)}>Luyện lại {wrong.length} từ sai</button>}<button className="study-button" onClick={()=>reset(direction)}>Học lại cả bài</button></div></div>:<>
      <div className="study-counter"><span>Câu {position+1} / {queue.length}</span><span>{correct} đúng · {wrong.length} cần ôn</span></div>
      <form onSubmit={check} className="study-writing"><span className="study-eyebrow">{direction==='en-vi'?'VIẾT NGHĨA TIẾNG VIỆT':'VIẾT TỪ TIẾNG ANH'}</span><h2 lang={direction==='en-vi'?'en':'vi'}>{direction==='en-vi'?word.spokenText:word.meaning}</h2>
        <label htmlFor={`writing-${lesson.slug}`}>Câu trả lời của bạn</label><input id={`writing-${lesson.slug}`} value={answer} onChange={event=>{setAnswer(event.target.value);if(!started)setStarted(Date.now());}} disabled={!!result||record.blocked} autoComplete="off" spellCheck={false} maxLength={2000} placeholder={direction==='en-vi'?'Nhập một nghĩa tiếng Việt…':'Nhập từ tiếng Anh…'}/>
        <p className="study-hint">{direction==='en-vi'?'Chấp nhận một nghĩa được liệt kê trong bài; viết có dấu tiếng Việt.':'Không phân biệt chữ hoa/thường; nhập đầy đủ từ hoặc cụm từ.'}</p>
        {!result && <button type="submit" className="study-button primary" disabled={!answer.trim()||record.blocked}>Kiểm tra</button>}
      </form>
      {result&&<div className={`study-feedback ${result.results[0].correct?'is-correct':'is-wrong'}`} role="status"><strong>{result.results[0].correct?'Chính xác!':'Chưa đúng — cùng ghi nhớ lại nhé.'}</strong><p>Đáp án: <strong>{result.results[0].expected}</strong></p><p className="study-hint">Đã lưu kết quả.</p><button className="study-button primary" onClick={next}>{position===queue.length-1?'Xem tổng kết':'Câu tiếp theo →'}</button></div>}
    </>}
    <SaveNotice {...record}/>
  </section>;
}
