import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { BookUnit, ExerciseRequest, ExerciseResult } from './types.ts';

export class ExerciseInputError extends Error {}
const normalize = (value: string) => value.normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ');
const accepted = (key: string) => key.replace(/\s*\(or\s+([^)]*)\)/gi,'/$1').split('/').map(normalize);

export function gradeExercise(input: unknown, unit: BookUnit, scope = unit.questions.map(q=>q.id)): ExerciseResult {
  if (!input || typeof input !== 'object') throw new ExerciseInputError('Dữ liệu lượt làm bài không hợp lệ.');
  const request=input as ExerciseRequest;
  if (typeof request.id!=='string' || !/^[\w-]{10,80}$/.test(request.id) || request.unitId!==unit.id ||
    !Number.isInteger(request.durationMs) || request.durationMs<0 || request.durationMs>86400000 ||
    (request.retryOf!==undefined && (typeof request.retryOf!=='string'||!/^[\w-]{10,80}$/.test(request.retryOf))) ||
    !request.answers || typeof request.answers!=='object' || Array.isArray(request.answers)) throw new ExerciseInputError('Dữ liệu lượt làm bài không hợp lệ.');
  const entries=Object.entries(request.answers);
  if (!entries.length || entries.length!==scope.length || entries.some(([id])=>!scope.includes(id))) throw new ExerciseInputError('Hãy trả lời đủ các câu trong lượt làm bài trước khi nộp.');
  const results=entries.map(([questionId,answer])=>{
    const question=unit.questions.find(q=>q.id===questionId);
    if (!question || typeof answer!=='string' || !answer.trim() || answer.length>300 ||
      (question.choices && !question.choices.some(c=>normalize(c)===normalize(answer)))) throw new ExerciseInputError('Câu trả lời không hợp lệ.');
    const selectedChoice = question.choices?.find(choice => normalize(choice) === normalize(answer));
    return {
      questionId,label:question.label,answer,expected:question.answer,correct:accepted(question.answer).includes(normalize(answer)),
      ...(question.prompt ? { prompt: question.prompt } : {}),
      ...(question.choiceTexts ? { answerText: question.choiceTexts[selectedChoice ?? answer], expectedText: question.choiceTexts[question.answer] } : {}),
      ...(question.explanation ? { explanation: question.explanation } : {}),
      ...(question.sourceNote ? { sourceNote: question.sourceNote } : {}),
    };
  });
  return {id:request.id,unitId:unit.id,durationMs:request.durationMs,createdAt:new Date().toISOString(),score:results.filter(r=>r.correct).length,total:results.length,results};
}

export class ExerciseStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS essential_sessions(id TEXT PRIMARY KEY, unit TEXT NOT NULL, request TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS essential_unit_date ON essential_sessions(unit,created_at DESC);`);
  }
  close(){this.db.close();}
  read(unit: string): ExerciseResult[] {
    return this.db.prepare('SELECT result FROM essential_sessions WHERE unit=? ORDER BY created_at DESC, rowid DESC LIMIT 50').all(unit).map(row=>JSON.parse(String(row.result)) as ExerciseResult);
  }
  save(input: unknown, unit: BookUnit): ExerciseResult {
    let scope: string[]|undefined;
    if(input && typeof input==='object' && 'retryOf' in input && input.retryOf!==undefined){
      if(typeof input.retryOf!=='string')throw new ExerciseInputError('Lượt ôn lại không hợp lệ.');
      const parent=this.db.prepare('SELECT result FROM essential_sessions WHERE id=? AND unit=?').get(input.retryOf,unit.id);
      if(!parent)throw new ExerciseInputError('Không tìm thấy lượt làm bài để ôn lại.');
      const previous=JSON.parse(String(parent.result)) as ExerciseResult;
      scope=previous.results.filter(answer=>!answer.correct).map(answer=>answer.questionId);
    }
    const result=gradeExercise(input,unit,scope);
    const request=input as ExerciseRequest;
    const serialized=JSON.stringify({id:request.id,unitId:request.unitId,durationMs:request.durationMs,retryOf:request.retryOf,answers:Object.fromEntries(Object.entries(request.answers).sort(([a],[b])=>a.localeCompare(b)))});
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous=this.db.prepare('SELECT request,result FROM essential_sessions WHERE id=?').get(result.id);
      if(previous){
        if(previous.request!==serialized) throw new ExerciseInputError('Mã lượt làm bài đã được dùng cho nội dung khác.');
        this.db.exec('COMMIT');return JSON.parse(String(previous.result)) as ExerciseResult;
      }
      this.db.prepare('INSERT INTO essential_sessions(id,unit,request,result,created_at) VALUES(?,?,?,?,?)').run(result.id,unit.id,serialized,JSON.stringify(result),result.createdAt);
      this.db.exec('COMMIT');return result;
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
}
