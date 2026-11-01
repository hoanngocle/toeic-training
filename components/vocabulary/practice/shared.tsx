"use client";
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import type { Direction } from '../../../lib/learning/practice';
import type { Session } from '../../../lib/learning/types';

export function DirectionPicker({value, onChange, disabled=false}: {value:Direction;onChange:(value:Direction)=>void;disabled?:boolean}) {
  return <label className="study-direction"><select aria-label="Chiều học" value={value} disabled={disabled} onChange={event=>onChange(event.target.value as Direction)}><option value="en-vi">Anh → Việt</option><option value="vi-en">Việt → Anh</option></select><ChevronDownIcon width={20} height={20} aria-hidden="true" /></label>;
}
export function SaveNotice({saving,error,retry}: {saving:boolean;error:string;retry:()=>void}) {
  return <div className="study-save" role="status">{saving ? 'Đang lưu kết quả…' : error ? <><span>{error}</span> <button className="study-button" onClick={retry}>Thử lưu lại</button></> : null}</div>;
}
export function AnswerReview({session}: {session:Session}) {
  return <ol className="study-review">{session.results.map((answer,index)=><li key={`${answer.wordId}-${index}`} className={answer.correct?'is-correct':'is-wrong'}>
    <div><strong>{index+1}. {answer.direction==='en-vi'?answer.term:answer.meaning}</strong><span className="study-resultTag">{answer.correct?'Đúng':'Cần ôn lại'}</span></div>
    <p>Bạn trả lời: <span>{answer.answer || '(Bỏ trống)'}</span></p><p>Đáp án: <strong>{answer.expected}</strong></p>
  </li>)}</ol>;
}
