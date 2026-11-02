"use client";
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import type { Lesson } from '../catalog';
import type { LearningState } from '../../../lib/learning/types';
import dynamic from 'next/dynamic';
import DeferredContent from '../../ui/deferred-content';
import { useRememberedTab } from '../use-remembered-tab';
import type { EssentialTab, PublicBookSection } from '../../../lib/essential/types';
import { LoadingStatus } from '../../ui/loading';
import { lessonCompletion, lessonAnswerProgress } from '../../../lib/learning/completion';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const tabLoading = () => <LoadingStatus label="Đang tải phần luyện tập…" />;
const FlashCards = dynamic(() => import('./flash-cards'), { loading: tabLoading });
const Writing = dynamic(() => import('./writing'), { loading: tabLoading });
const TestMode = dynamic(() => import('./test-mode'), { loading: tabLoading });
const EssentialSection = dynamic(() => import('../essential/section'), { loading: tabLoading });
const LessonHistory = dynamic(() => import('./history'), { loading: tabLoading });

const practiceTabs=[['list','Danh sách từ'],['flashcard','Flash Card'],['writing','Writing'],['test','Test']] as const;
const bookTabs=[['context','Words in Context'],['families','Word Families'],['reading','Reading'],['listening','Listening'],['review','Word Review']] as const;
type Tab=(typeof practiceTabs)[number][0] | EssentialTab | 'history';
export default function PracticeWorkspace({lesson,children,sections}: {lesson:Lesson;children:ReactNode|((state:LearningState|null)=>ReactNode);sections?:Partial<Record<EssentialTab,PublicBookSection>>}) {
  const availableBookTabs=bookTabs.filter(([id])=>(sections?.[id]?.units.length ?? 0)>0);
  const tabs:readonly (readonly [Tab,string])[]=[...practiceTabs,...availableBookTabs,['history','Lịch sử']];
  const [tab,setTab]=useRememberedTab<Tab>(`vocabulary:${lesson.slug}:tab`, tabs.map(([id])=>id), 'list');
  const [state,setState]=useState<LearningState|null>(null);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  const refresh=useCallback(()=>setRevision(value=>value+1),[]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/learning?lesson=${encodeURIComponent(lesson.slug)}&view=progress`,{cache:'no-store',signal:controller.signal})
      .then(async response=>{if(!response.headers.get("content-type")?.includes("application/json"))throw new Error("Chưa kết nối được dữ liệu học. Vui lòng thử lại.");const data=await response.json();if(!response.ok)throw new Error(data.error);return data as LearningState;})
      .then(data=>{if(!controller.signal.aborted){setState(data);setError('');}})
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
  const baseProgress=state?.progress.filter(progress=>lesson.words.some(word=>word.id===progress.wordId))??[];
  const {completed}=lessonCompletion(lesson.words,baseProgress);
  const {answeredCorrectly,percent}=lessonAnswerProgress(lesson.words,baseProgress);
  return <>
    <section className={`study-summary${completed ? ' is-completed' : ''}`} aria-label="Tiến độ bài học">
      <div><span className="study-eyebrow">TIẾN ĐỘ CỦA BẠN</span><strong>{state?`${answeredCorrectly} / ${lesson.words.length} từ đã trả lời đúng · ${percent}%`:error ? 'Chưa tải được tiến độ' : <LoadingStatus label="Đang tải tiến độ…" />}</strong><p>{state?`${baseProgress.length} từ chính đã luyện · ${state.totalSessions} lượt Writing / Test`: 'Kết quả được lưu trên máy chạy app.'}</p></div>
      {completed && <span className="vocab-completedBadge"><CheckCircleIcon width={18} height={18} aria-hidden="true" />Đã học xong</span>}
      <progress max={lesson.words.length} value={answeredCorrectly} aria-label="Số từ đã trả lời đúng ít nhất một lần"/>
    </section>
    {error&&<p className="study-error" role="alert">{error} <button className="study-button" onClick={refresh}>Tải lại tiến độ</button></p>}
    <div className="study-tabs study-modeTabs" role="tablist" aria-label="Chế độ học">{tabs.map(([id,label],index)=><button key={id} id={`tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`panel-${id}`} tabIndex={tab===id?0:-1} onKeyDown={event=>handleKeys(event,index)} onClick={()=>choose(id)}>{label}</button>)}</div>
    <div id="panel-list" role="tabpanel" aria-labelledby="tab-list" hidden={tab!=='list'}>{typeof children==='function'?children(state):children}</div>
    <div id="panel-flashcard" role="tabpanel" aria-labelledby="tab-flashcard" hidden={tab!=='flashcard'}><DeferredContent active={tab==='flashcard'}><FlashCards lesson={lesson} progress={state?.progress??[]} onSaved={refresh}/></DeferredContent></div>
    <div id="panel-writing" role="tabpanel" aria-labelledby="tab-writing" hidden={tab!=='writing'}><DeferredContent active={tab==='writing'}><Writing lesson={lesson} onSaved={refresh}/></DeferredContent></div>
    <div id="panel-test" role="tabpanel" aria-labelledby="tab-test" hidden={tab!=='test'}><DeferredContent active={tab==='test'}><TestMode lesson={lesson} onSaved={refresh}/></DeferredContent></div>
    <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" hidden={tab!=='history'}>
      <DeferredContent active={tab==='history'}><LessonHistory lesson={lesson} progress={state?.progress} revision={revision} onRefresh={refresh}/></DeferredContent>
    </div>
    {availableBookTabs.map(([id])=><div key={id} id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={tab!==id}><DeferredContent active={tab===id}><EssentialSection section={sections![id]!} active={tab===id} storageKey={`vocabulary:${lesson.slug}:${id}:part`}/></DeferredContent></div>)}
  </>;
}
