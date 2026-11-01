"use client";
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import type { Lesson } from '../catalog';
import type { LearningState } from '../../../lib/learning/types';
import FlashCards from './flash-cards';
import Writing from './writing';
import TestMode from './test-mode';
import { AnswerReview } from './shared';
import EssentialSection from '../essential/section';
import { useRememberedTab } from '../use-remembered-tab';
import type { EssentialTab, PublicBookSection } from '../../../lib/essential/types';

const practiceTabs=[['list','Danh sách từ'],['flashcard','Flash Card'],['writing','Writing'],['test','Test']] as const;
const bookTabs=[['context','Words in Context'],['families','Word Families'],['reading','Reading'],['listening','Listening'],['review','Word Review']] as const;
type Tab=(typeof practiceTabs)[number][0] | EssentialTab | 'history';
export default function PracticeWorkspace({lesson,children,sections}: {lesson:Lesson;children:ReactNode;sections?:Partial<Record<EssentialTab,PublicBookSection>>}) {
  const availableBookTabs=bookTabs.filter(([id])=>(sections?.[id]?.units.length ?? 0)>0);
  const tabs:readonly (readonly [Tab,string])[]=[...practiceTabs,...availableBookTabs,['history','Lịch sử']];
  const [tab,setTab]=useRememberedTab<Tab>(`vocabulary:${lesson.slug}:tab`, tabs.map(([id])=>id), 'list');
  const [state,setState]=useState<LearningState|null>(null);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  const refresh=useCallback(()=>setRevision(value=>value+1),[]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/learning?lesson=${encodeURIComponent(lesson.slug)}`,{cache:'no-store',signal:controller.signal})
      .then(async response=>{if(!response.headers.get("content-type")?.includes("application/json"))throw new Error("Chưa kết nối được dữ liệu học. Vui lòng thử lại.");const data=await response.json();if(!response.ok)throw new Error(data.error);return data as LearningState;})
      .then(data=>{setState(data);setError('');})
      .catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Không đọc được tiến độ.');});
    return ()=>controller.abort();
  },[lesson.slug,revision]);
  function choose(next:Tab) {window.dispatchEvent(new Event('vocabulary-stop-audio'));setTab(next);}
  function handleKeys(event:KeyboardEvent<HTMLButtonElement>,index:number) {
    let target=index;
    if(event.key==='ArrowRight')target=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft')target=(index+tabs.length-1)%tabs.length;
    else if(event.key==='Home')target=0;
    else if(event.key==='End')target=tabs.length-1;
    else return;
    event.preventDefault();choose(tabs[target][0]);document.getElementById(`tab-${tabs[target][0]}`)?.focus();
  }
  const learned=state?.progress.filter(word=>word.status==='learned').length??0;
  return <>
    <section className="study-summary" aria-label="Tiến độ bài học">
      <div><span className="study-eyebrow">TIẾN ĐỘ CỦA BẠN</span><strong>{state?`${learned} / ${lesson.words.length} từ đã nhớ`:'Đang tải tiến độ…'}</strong><p>{state?`${state.progress.length} từ đã luyện · ${state.totalSessions} lượt Writing / Test`: 'Kết quả được lưu trên máy chạy app.'}</p></div>
      <progress max={lesson.words.length} value={learned} aria-label="Số từ đã nhớ"/>
    </section>
    {error&&<p className="study-error" role="alert">{error} <button className="study-button" onClick={refresh}>Tải lại tiến độ</button></p>}
    <div className="study-tabs study-modeTabs" role="tablist" aria-label="Chế độ học">{tabs.map(([id,label],index)=><button key={id} id={`tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`panel-${id}`} tabIndex={tab===id?0:-1} onKeyDown={event=>handleKeys(event,index)} onClick={()=>choose(id)}>{label}</button>)}</div>
    <div id="panel-list" role="tabpanel" aria-labelledby="tab-list" hidden={tab!=='list'}>{children}</div>
    <div id="panel-flashcard" role="tabpanel" aria-labelledby="tab-flashcard" hidden={tab!=='flashcard'}><FlashCards lesson={lesson} progress={state?.progress??[]} onSaved={refresh}/></div>
    <div id="panel-writing" role="tabpanel" aria-labelledby="tab-writing" hidden={tab!=='writing'}><Writing lesson={lesson} onSaved={refresh}/></div>
    <div id="panel-test" role="tabpanel" aria-labelledby="tab-test" hidden={tab!=='test'}><TestMode lesson={lesson} onSaved={refresh}/></div>
    <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" hidden={tab!=='history'}>
      <section className="study-panel"><div className="study-toolbar"><h2>Lịch sử học bài</h2><button className="study-button" onClick={refresh}>Cập nhật</button></div><p className="study-hint">50 lượt Writing / Test gần nhất. Flash Card được lưu vào tiến độ từng từ.</p>
        {!state?<p>Đang tải lịch sử…</p>:!state.sessions.length?<div className="study-complete"><h3>Chưa có kết quả</h3><p>Hoàn thành một câu Writing hoặc một bài Test để xem kết quả tại đây.</p></div>:<div className="study-history">{state.sessions.map(session=><details key={session.id}><summary><span><strong>{session.mode==='test'?'Test':'Writing'}</strong> · {session.score}/{session.total} đúng</span><span>{new Date(session.createdAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · {Math.ceil(session.durationMs/1000)} giây</span></summary><AnswerReview session={session}/></details>)}</div>}
        {state&&<details className="study-wordProgress"><summary>Tiến độ từng từ ({state.progress.length} từ đã luyện)</summary><p className="study-hint">“Đã nhớ” khi bạn tự đánh giá trên Flash Card hoặc trả lời đúng 3 lần liên tiếp. Trả lời sai sẽ đưa từ về “Đang học”.</p><ul>{state.progress.map(progress=><li key={progress.wordId}><strong>{lesson.words.find(word=>word.id===progress.wordId)?.spokenText}</strong><span>{progress.status==='learned'?'Đã nhớ':'Đang học'} · {progress.reviews} lần luyện · {progress.correct} đúng / {progress.incorrect} sai</span></li>)}</ul></details>}
      </section>
    </div>
    {availableBookTabs.map(([id])=><div key={id} id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={tab!==id}><EssentialSection section={sections![id]!} active={tab===id} storageKey={`vocabulary:${lesson.slug}:${id}:part`}/></div>)}
  </>;
}
