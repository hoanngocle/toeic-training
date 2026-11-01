import { initializeActivity, recordActivity } from '../achievements/activity.ts';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { BookUnit, ExerciseRequest, ExerciseResult } from './types.ts';

import { gradeExercise, ExerciseInputError } from './grading.ts';
export { gradeExercise, ExerciseInputError } from './grading.ts';

export class ExerciseStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS essential_sessions(id TEXT PRIMARY KEY, unit TEXT NOT NULL, request TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS essential_unit_date ON essential_sessions(unit,created_at DESC);`);
    initializeActivity(this.db);
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
      recordActivity(this.db, result.createdAt);
      this.db.exec('COMMIT');return result;
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
}
