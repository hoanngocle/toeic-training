"use client";
import { RewardPopup } from "../../progression/reward-popup";
import { RewardNotice } from "../../progression/progression-card";
import { useState } from 'react';
import type { Lesson } from '../catalog';
import { makeQuestions, normalizeAnswer } from '../../../lib/learning/practice';
import type { Question, TestFormat } from '../../../lib/learning/practice';
import type { Session } from '../../../lib/learning/types';
import { AnswerReview, SaveNotice } from './shared';
import { elapsed, useRecord } from './use-record';

export default function TestMode({lesson,onSaved}: {lesson:Lesson;onSaved:()=>void}) {
  const [format,setFormat]=useState<TestFormat>('multiple-choice');
  const [questions,setQuestions]=useState<Question[]>([]);
  const [answers,setAnswers]=useState<Record<number,string>>({});
  const [position,setPosition]=useState(0);
  const [retryOf,setRetryOf]=useState<string|undefined>();
  const [started,setStarted]=useState(0);
  const [result,setResult]=useState<Session|null>(null);
  const [error,setError]=useState('');
  const record=useRecord(setResult,onSaved);
  const questionCount=Math.min(20,new Set(lesson.words.map(word=>normalizeAnswer(word.spokenText))).size);
  function start(ids?:number[]) {
    setRetryOf(ids ? result?.id : undefined);
    try {setQuestions(makeQuestions(lesson.words,ids,format));setAnswers({});setPosition(0);setStarted(Date.now());setResult(null);setError('');}
    catch(error) {setError(error instanceof Error?error.message:'Chưa tạo được bài kiểm tra.');}
  }
  const answeredCount=questions.filter(question=>answers[question.wordId]?.trim()).length;
  function chooseFormat() {setQuestions([]);setAnswers({});setPosition(0);setResult(null);setError('');}
  function submit() {
    if(record.blocked||answeredCount!==questions.length)return;
    void record.submit({id:crypto.randomUUID(),lesson:lesson.slug,mode:'test',...(retryOf?{retryOf}:{}),durationMs:elapsed(started),answers:questions.map(question=>({wordId:question.wordId,direction:question.direction,answer:answers[question.wordId]??''}))});
  }
  const question=questions[position];
  const wrong=result?.results.filter(answer=>!answer.correct).map(answer=>answer.wordId)??[];
  return <section className="study-panel" aria-label="Test">
    {!questions.length?<div className="study-complete"><span className="study-eyebrow">KIỂM TRA TỪ VỰNG</span><h2>{questionCount} câu. Bạn nhớ được bao nhiêu?</h2><p>{Math.ceil(questionCount/2)} câu Anh → Việt và {Math.floor(questionCount/2)} câu Việt → Anh. {format==='typing'?'Tự nhập đáp án, không giới hạn thời gian.':'Mỗi câu có 4 lựa chọn, không giới hạn thời gian.'}</p><fieldset className="study-testFormats"><legend>Loại bài test</legend><label className={format==='multiple-choice'?'is-selected':''}><input type="radio" name={`test-format-${lesson.slug}`} value="multiple-choice" checked={format==='multiple-choice'} onChange={()=>setFormat('multiple-choice')}/><span><strong>Trắc nghiệm</strong><small>Chọn 1 trong 4 đáp án</small></span></label><label className={format==='typing'?'is-selected':''}><input type="radio" name={`test-format-${lesson.slug}`} value="typing" checked={format==='typing'} onChange={()=>setFormat('typing')}/><span><strong>Typing</strong><small>Tự nhập từ hoặc nghĩa</small></span></label></fieldset><p className="study-hint">Bạn có thể sửa đáp án trước khi nộp. Điểm và đáp án chỉ hiện sau khi nộp bài.</p><button className="study-button primary" onClick={()=>start()}>Bắt đầu Test</button></div>:result?<>
      <div className="study-complete"><span className="study-eyebrow">KẾT QUẢ ĐÃ LƯU</span><h2>{result.score} / {result.total} câu đúng</h2><RewardNotice result={result}/><p>{Math.round((result.score??0)/result.total*100)}% · {Math.ceil(result.durationMs/1000)} giây</p><p>{wrong.length?`${wrong.length} từ cần ôn lại bên dưới.`:'Bạn đã trả lời đúng tất cả các câu!'}</p><div className="study-rating">{!!wrong.length&&<button className="study-button primary" onClick={()=>start(wrong)}>Làm lại {wrong.length} câu sai</button>}<button className="study-button" onClick={()=>start()}>Tạo đề mới</button><button className="study-button" onClick={chooseFormat}>Chọn loại bài khác</button></div></div>
      <AnswerReview session={result}/>
    </>:<>
      <div className="study-counter"><span>{format==='typing'?'Typing':'Trắc nghiệm'} · Câu {position+1} / {questions.length}</span><span>Đã trả lời {answeredCount} / {questions.length}</span></div>
      <fieldset className="study-question" disabled={record.blocked}><legend><span className="study-eyebrow">{format==='typing'?'NHẬP':'CHỌN'} {question.direction==='en-vi'?'NGHĨA TIẾNG VIỆT':'TỪ TIẾNG ANH'}</span><strong lang={question.direction==='en-vi'?'en':'vi'}>{question.prompt}</strong></legend>
        {format==='typing'?<div className="study-testTyping"><input key={question.wordId} aria-label="Câu trả lời" value={answers[question.wordId]??''} onChange={event=>setAnswers(current=>({...current,[question.wordId]:event.target.value}))} autoComplete="off" spellCheck={false} maxLength={2000} placeholder={question.direction==='en-vi'?'Nhập một nghĩa tiếng Việt…':'Nhập từ tiếng Anh…'}/><p className="study-hint">{question.direction==='en-vi'?'Nhập một nghĩa trong bài, có dấu tiếng Việt.':'Nhập đầy đủ từ hoặc cụm từ; không phân biệt chữ hoa/thường.'}</p></div>:<div className="study-choices">{question.choices.map((choice,i)=><label className={answers[question.wordId]===choice?'selected':''} key={choice}><input type="radio" name={`question-${question.wordId}`} value={choice} checked={answers[question.wordId]===choice} onChange={()=>setAnswers({...answers,[question.wordId]:choice})}/><span className="study-choiceLetter">{String.fromCharCode(65+i)}</span><span>{choice}</span></label>)}</div>}
      </fieldset>
      <div className="study-navigation"><button className="study-button" disabled={position===0||record.blocked} onClick={()=>setPosition(position-1)}>← Câu trước</button><button className="study-button" disabled={position===questions.length-1||record.blocked} onClick={()=>setPosition(position+1)}>Câu tiếp →</button></div>
      <nav className="study-questionMap" aria-label="Chọn câu hỏi">{questions.map((item,i)=><button key={item.wordId} className={`study-button ${answers[item.wordId]?.trim()?'answered':''}`} aria-current={i===position?'step':undefined} aria-label={`Câu ${i+1}${answers[item.wordId]?.trim()?', đã trả lời':', chưa trả lời'}`} disabled={record.blocked} onClick={()=>setPosition(i)}>{i+1}</button>)}</nav>
      <button className="study-button primary study-submit" disabled={answeredCount!==questions.length||record.blocked} onClick={submit}>Nộp bài · {answeredCount}/{questions.length}</button><p className="study-hint">Trả lời đủ các câu để nộp bài.</p>
    </>}
    {result && <RewardPopup result={result}/>}
    {error&&<p role="alert">{error}</p>}<SaveNotice {...record}/>
  </section>;
}
