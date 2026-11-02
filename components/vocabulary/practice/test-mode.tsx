"use client";
import { RewardPopup } from "../../progression/reward-popup";
import { RewardNotice } from "../../progression/progression-card";
import { useState } from 'react';
import type { Lesson } from '../catalog';
import { makeQuestions, withWordFamilies } from '../../../lib/learning/practice';
import type { Question, TestFormat } from '../../../lib/learning/practice';
import type { Session } from '../../../lib/learning/types';
import { AnswerReview, SaveNotice, WordFamiliesOption } from './shared';
import { elapsed, useRecord } from './use-record';

export default function TestMode({lesson,onSaved}: {lesson:Lesson;onSaved:()=>void}) {
  const [format,setFormat]=useState<TestFormat>('multiple-choice');
  const [includeWordFamilies,setIncludeWordFamilies]=useState(false);
  const expandedWords=withWordFamilies(lesson.words,lesson.wordFamilies);
  const familyCount=expandedWords.length-lesson.words.length;
  const words=includeWordFamilies?expandedWords:lesson.words;
  const [questions,setQuestions]=useState<Question[]>([]);
  const [answers,setAnswers]=useState<Record<number,string>>({});
  const [retryOf,setRetryOf]=useState<string|undefined>();
  const [started,setStarted]=useState(0);
  const [result,setResult]=useState<Session|null>(null);
  const [error,setError]=useState('');
  const record=useRecord(setResult,onSaved);
  function start(ids?:number[]) {
    setRetryOf(ids ? result?.id : undefined);
    try {setQuestions(makeQuestions(words,ids,format));setAnswers({});setStarted(Date.now());setResult(null);setError('');}
    catch(error) {setError(error instanceof Error?error.message:'Chưa tạo được bài kiểm tra.');}
  }
  const answeredCount=questions.filter(question=>answers[question.wordId]?.trim()).length;
  function chooseFormat() {setQuestions([]);setAnswers({});setResult(null);setError('');}
  function submit() {
    if(record.blocked||answeredCount!==questions.length)return;
    void record.submit({id:crypto.randomUUID(),lesson:lesson.slug,mode:'test',...(includeWordFamilies?{includeWordFamilies:true}:{}),...(retryOf?{retryOf}:{}),durationMs:elapsed(started),answers:questions.map(question=>({wordId:question.wordId,direction:question.direction,answer:answers[question.wordId]??''}))});
  }
  const wrong=result?.results.filter(answer=>!answer.correct).map(answer=>answer.wordId)??[];
  return <section className="study-panel" aria-label="Test">
    {!questions.length?<div className="study-complete"><span className="study-eyebrow">KIỂM TRA TỪ VỰNG</span><fieldset className="study-testFormats"><legend>Loại bài test</legend><label className={format==='multiple-choice'?'is-selected':''}><input type="radio" name={`test-format-${lesson.slug}`} value="multiple-choice" checked={format==='multiple-choice'} onChange={()=>setFormat('multiple-choice')}/><span><strong>Trắc nghiệm</strong><small>Chọn 1 trong 4 đáp án</small></span></label><label className={format==='typing'?'is-selected':''}><input type="radio" name={`test-format-${lesson.slug}`} value="typing" checked={format==='typing'} onChange={()=>setFormat('typing')}/><span><strong>Typing</strong><small>Tự nhập từ hoặc nghĩa</small></span></label></fieldset><WordFamiliesOption value={includeWordFamilies} onChange={setIncludeWordFamilies} count={familyCount}/><p className="study-hint">{Math.min(20,words.length)} câu · {includeWordFamilies?"Từ vựng + Word Families":"Từ vựng trong bài"}</p><button className="study-button primary" onClick={()=>start()}>Bắt đầu Test</button></div>:result?<>
      <div className="study-complete"><span className="study-eyebrow">KẾT QUẢ ĐÃ LƯU</span><h2>{result.score} / {result.total} câu đúng</h2><RewardNotice result={result}/><p>{Math.round((result.score??0)/result.total*100)}% · {Math.ceil(result.durationMs/1000)} giây</p><p>{wrong.length?`${wrong.length} từ cần ôn lại bên dưới.`:'Bạn đã trả lời đúng tất cả các câu!'}</p><div className="study-rating">{!!wrong.length&&<button className="study-button primary" onClick={()=>start(wrong)}>Làm lại {wrong.length} câu sai</button>}<button className="study-button" onClick={()=>start()}>Tạo đề mới</button><button className="study-button" onClick={chooseFormat}>Chọn loại bài khác</button></div></div>
      <p className="study-hint">{result.includeWordFamilies?"Từ vựng + Word Families":"Từ vựng trong bài"}</p><AnswerReview session={result}/>
    </>:<>
      <div className="study-counter"><span>{includeWordFamilies?'Từ vựng + Word Families · ':''}{format==='typing'?'Typing':'Trắc nghiệm'} · {questions.length} câu</span><span>Đã trả lời {answeredCount} / {questions.length}</span></div>
      <div className="study-testQuestions">{questions.map((question,index)=><fieldset key={question.wordId} className="study-question" disabled={record.blocked}><legend><span className="study-eyebrow">Câu {index+1} · {format==='typing'?'NHẬP':'CHỌN'} {question.direction==='en-vi'?'NGHĨA TIẾNG VIỆT':'TỪ TIẾNG ANH'}</span><strong lang={question.direction==='en-vi'?'en':'vi'}>{question.prompt}</strong></legend>
        {format==='typing'?<div className="study-testTyping"><input key={question.wordId} aria-label="Câu trả lời" value={answers[question.wordId]??''} onChange={event=>setAnswers(current=>({...current,[question.wordId]:event.target.value}))} autoComplete="off" spellCheck={false} maxLength={2000} placeholder={question.direction==='en-vi'?'Nhập một nghĩa tiếng Việt…':'Nhập từ tiếng Anh…'}/><p className="study-hint">{question.direction==='en-vi'?'Nhập một nghĩa trong bài, có dấu tiếng Việt.':'Nhập đầy đủ từ hoặc cụm từ; không phân biệt chữ hoa/thường.'}</p></div>:<div className="study-choices">{question.choices.map((choice,i)=><label className={answers[question.wordId]===choice?'selected':''} key={choice}><input type="radio" name={`question-${question.wordId}`} value={choice} checked={answers[question.wordId]===choice} onChange={()=>setAnswers({...answers,[question.wordId]:choice})}/><span className="study-choiceLetter">{String.fromCharCode(65+i)}</span><span>{choice}</span></label>)}</div>}
      </fieldset>)}</div>
      <button className="study-button primary study-submit" disabled={answeredCount!==questions.length||record.blocked} onClick={submit}>Nộp bài · {answeredCount}/{questions.length}</button><p className="study-hint">Trả lời đủ các câu để nộp bài.</p>
    </>}
    {result && <RewardPopup result={result}/>}
    {error&&<p role="alert">{error}</p>}<SaveNotice {...record}/>
  </section>;
}
