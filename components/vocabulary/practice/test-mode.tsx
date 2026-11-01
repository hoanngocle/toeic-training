"use client";
import { useState } from 'react';
import type { Lesson } from '../catalog';
import { makeQuestions, normalizeAnswer } from '../../../lib/learning/practice';
import type { Question } from '../../../lib/learning/practice';
import type { Session } from '../../../lib/learning/types';
import { AnswerReview, SaveNotice } from './shared';
import { elapsed, useRecord } from './use-record';

export default function TestMode({lesson,onSaved}: {lesson:Lesson;onSaved:()=>void}) {
  const [questions,setQuestions]=useState<Question[]>([]);
  const [answers,setAnswers]=useState<Record<number,string>>({});
  const [position,setPosition]=useState(0);
  const [started,setStarted]=useState(0);
  const [result,setResult]=useState<Session|null>(null);
  const [error,setError]=useState('');
  const record=useRecord(setResult,onSaved);
  const questionCount=Math.min(20,new Set(lesson.words.map(word=>normalizeAnswer(word.spokenText))).size);
  function start(ids?:number[]) {
    try {setQuestions(makeQuestions(lesson.words,ids));setAnswers({});setPosition(0);setStarted(Date.now());setResult(null);setError('');}
    catch(error) {setError(error instanceof Error?error.message:'Chưa tạo được bài kiểm tra.');}
  }
  function submit() {
    if(record.blocked||Object.keys(answers).length!==questions.length)return;
    void record.submit({id:crypto.randomUUID(),lesson:lesson.slug,mode:'test',durationMs:elapsed(started),answers:questions.map(question=>({wordId:question.wordId,direction:question.direction,answer:answers[question.wordId]??''}))});
  }
  const question=questions[position];
  const wrong=result?.results.filter(answer=>!answer.correct).map(answer=>answer.wordId)??[];
  return <section className="study-panel" aria-label="Test">
    {!questions.length?<div className="study-complete"><span className="study-eyebrow">KIỂM TRA TỪ VỰNG</span><h2>{questionCount} câu. Bạn nhớ được bao nhiêu?</h2><p>{Math.ceil(questionCount/2)} câu Anh → Việt và {Math.floor(questionCount/2)} câu Việt → Anh. Mỗi câu có 4 lựa chọn, không giới hạn thời gian.</p><p className="study-hint">Bạn có thể đổi lựa chọn trước khi nộp. Điểm và đáp án chỉ hiện sau khi nộp bài.</p><button className="study-button primary" onClick={()=>start()}>Bắt đầu Test</button></div>:result?<>
      <div className="study-complete"><span className="study-eyebrow">KẾT QUẢ ĐÃ LƯU</span><h2>{result.score} / {result.total} câu đúng</h2><p>{Math.round((result.score??0)/result.total*100)}% · {Math.ceil(result.durationMs/1000)} giây</p><p>{wrong.length?`${wrong.length} từ cần ôn lại bên dưới.`:'Bạn đã trả lời đúng tất cả các câu!'}</p><div className="study-rating">{!!wrong.length&&<button className="study-button primary" onClick={()=>start(wrong)}>Làm lại {wrong.length} câu sai</button>}<button className="study-button" onClick={()=>start()}>Tạo đề mới</button></div></div>
      <AnswerReview session={result}/>
    </>:<>
      <div className="study-counter"><span>Câu {position+1} / {questions.length}</span><span>Đã trả lời {Object.keys(answers).length} / {questions.length}</span></div>
      <fieldset className="study-question" disabled={record.blocked}><legend><span className="study-eyebrow">{question.direction==='en-vi'?'CHỌN NGHĨA TIẾNG VIỆT':'CHỌN TỪ TIẾNG ANH'}</span><strong lang={question.direction==='en-vi'?'en':'vi'}>{question.prompt}</strong></legend>
        <div className="study-choices">{question.choices.map((choice,i)=><label className={answers[question.wordId]===choice?'selected':''} key={choice}><input type="radio" name={`question-${question.wordId}`} value={choice} checked={answers[question.wordId]===choice} onChange={()=>setAnswers({...answers,[question.wordId]:choice})}/><span className="study-choiceLetter">{String.fromCharCode(65+i)}</span><span>{choice}</span></label>)}</div>
      </fieldset>
      <div className="study-navigation"><button className="study-button" disabled={position===0||record.blocked} onClick={()=>setPosition(position-1)}>← Câu trước</button><button className="study-button" disabled={position===questions.length-1||record.blocked} onClick={()=>setPosition(position+1)}>Câu tiếp →</button></div>
      <nav className="study-questionMap" aria-label="Chọn câu hỏi">{questions.map((item,i)=><button key={item.wordId} className={`study-button ${answers[item.wordId]?'answered':''}`} aria-current={i===position?'step':undefined} aria-label={`Câu ${i+1}${answers[item.wordId]?', đã trả lời':', chưa trả lời'}`} disabled={record.blocked} onClick={()=>setPosition(i)}>{i+1}</button>)}</nav>
      <button className="study-button primary study-submit" disabled={Object.keys(answers).length!==questions.length||record.blocked} onClick={submit}>Nộp bài · {Object.keys(answers).length}/{questions.length}</button><p className="study-hint">Trả lời đủ các câu để nộp bài.</p>
    </>}
    {error&&<p role="alert">{error}</p>}<SaveNotice {...record}/>
  </section>;
}
