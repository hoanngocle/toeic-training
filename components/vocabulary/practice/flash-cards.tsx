"use client";
import { useEffect, useRef, useState } from 'react';
import { LightBulbIcon, XMarkIcon, CheckIcon, ArrowsRightLeftIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import type { Lesson } from '../catalog';
import { shuffle } from '../../../lib/learning/practice';
import type { Direction } from '../../../lib/learning/practice';
import type { Progress } from '../../../lib/learning/types';
import PronounceButton from '../pronounce-button';
import { SaveNotice } from './shared';
import { useRecord } from './use-record';

export default function FlashCards({lesson,progress,onSaved}: {lesson:Lesson;progress:Progress[];onSaved:()=>void}) {
  const root=useRef<HTMLElement>(null);
  const [hint,setHint]=useState(false);
  const [notice,setNotice]=useState('');
  const [deck,setDeck]=useState(lesson.words);
  const [position,setPosition]=useState(0);
  const [flipped,setFlipped]=useState(false);
  const direction:Direction='en-vi';
  useEffect(()=>{
    function onKey(event:KeyboardEvent) {
      if(event.code!=='Space'||event.repeat||event.altKey||event.ctrlKey||event.metaKey||!root.current||root.current.closest('[hidden]'))return;
      const target=event.target;
      if(target instanceof HTMLElement && target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;
      event.preventDefault();setFlipped(value=>!value);
    }
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[]);
  const word=deck[position];
  const showEnglish=(direction==='en-vi')!==flipped;
  const record=useRecord(()=>{
    window.dispatchEvent(new Event('vocabulary-stop-audio'));
    if(position < deck.length-1) {
      setPosition(position+1);setFlipped(false);setHint(false);setNotice('');
    } else setNotice('Đã lưu đánh giá thẻ cuối.');
  },onSaved);
  function move(next:number) {window.dispatchEvent(new Event('vocabulary-stop-audio'));setPosition(next);setFlipped(false);setHint(false);setNotice('');}
  function rate(known:boolean) {
    if(record.blocked)return;
    void record.submit({id:crypto.randomUUID(),lesson:lesson.slug,mode:'flashcard',durationMs:0,answers:[{wordId:word.id,direction,answer:known?'known':'learning'}]});
  }
  const learned=progress.filter(entry=>entry.status==='learned').length;
  const learning=progress.filter(entry=>entry.status==='learning').length;
  const clue=showEnglish?word.pronunciation:word.spokenText.replace(/\b(\p{L})(\p{L}*)/gu,(_,first,rest)=>first+'·'.repeat(rest.length));
  return <section ref={root} className="study-panel study-flashPanel" aria-label="Flash Card">
    <div className="flash-scoreboard" aria-label="Tiến độ Flash Card"><span className="flash-learning"><strong>{learning}</strong> Đang học</span><span className="flash-learned">Đã biết <strong>{learned}</strong></span></div>
    <div className="flash-cardShell">
    <div className="study-flashStage">
      <button className="flash-hintToggle" aria-expanded={hint} aria-controls={`flash-hint-${lesson.slug}`} onClick={()=>setHint(!hint)}><LightBulbIcon width={21} height={21}/>{hint?'Ẩn gợi ý':'Hiển thị gợi ý'}</button>
      <button className={`study-flashcard ${flipped?'is-flipped':''}`} onClick={()=>setFlipped(!flipped)} aria-label={`Lật thẻ: ${showEnglish?'đang hiện tiếng Anh':'đang hiện tiếng Việt'}`}>
        <span key={`${word.id}-${direction}`} className="study-flashRotor">
          {[false,true].map(back=>{
            const english=(direction==='en-vi')!==back;
            return <span key={String(back)} className={`study-flashFace ${back?'study-flashBack':''}`} aria-hidden={flipped!==back}>
              <strong lang={english?'en':'vi'}>{english?word.term:word.meaning}</strong>
            </span>;
          })}
        </span>
      </button>
      <div id={`flash-hint-${lesson.slug}`} className="flash-clue" hidden={!hint}>{clue}</div>
      <div className="study-flashAudio"><PronounceButton text={word.spokenText}/></div>
    </div>
    </div>
    <div className="flash-controls">
      <div className="flash-decisions"><button className="flash-rate flash-rateAgain" title="Cần ôn lại" aria-label="Cần ôn lại" disabled={record.blocked} onClick={()=>rate(false)}><XMarkIcon width={30} height={30}/></button><button className="flash-rate flash-rateKnown" title="Đã biết" aria-label="Đã biết" disabled={record.blocked} onClick={()=>rate(true)}><CheckIcon width={30} height={30}/></button></div>
      <button className="flash-iconButton" title="Đảo thứ tự" aria-label="Đảo thứ tự" disabled={record.blocked} onClick={()=>{setDeck(shuffle(deck));move(0);}}><ArrowsRightLeftIcon width={23} height={23}/></button>
    </div>
    {notice && <p className="study-hint" role="status">{notice}</p>}
    <SaveNotice {...record}/>
    <div className="flash-pagination"><button className="flash-iconButton" title="Thẻ trước" aria-label="Thẻ trước" disabled={position===0||record.blocked} onClick={()=>move(position-1)}><ArrowLeftIcon width={20} height={20}/></button><span>{position+1} / {deck.length}</span><button className="flash-iconButton" title="Thẻ tiếp" aria-label="Thẻ tiếp" disabled={position===deck.length-1||record.blocked} onClick={()=>move(position+1)}><ArrowRightIcon width={20} height={20}/></button></div>
  </section>;
}
