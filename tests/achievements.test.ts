import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { activityDay, summarizeActivity, calendarDays } from '../lib/achievements/summary.ts';
import { readAchievements } from '../lib/achievements/store.ts';
import { LearningStore } from '../lib/learning/store.ts';
import { ExerciseStore } from '../lib/essential/store.ts';

test('Vietnam midnight assigns two adjacent UTC timestamps to separate activity days', () => {
  assert.equal(activityDay(new Date('2026-10-31T16:59:59Z')), '2026-10-31');
  assert.equal(activityDay(new Date('2026-10-31T17:00:00Z')), '2026-11-01');
});
test('streak deduplicates days, bridges month/year boundaries, and allows today to remain unfinished', () => {
  const days = ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-01'];
  assert.deepEqual(summarizeActivity(days, '2026-01-02'), {current:3, longest:3, activeDays:3});
  assert.deepEqual(summarizeActivity(days, '2026-01-03'), {current:0, longest:3, activeDays:3});
  assert.deepEqual(summarizeActivity([...days, '2026-01-03'], '2026-01-03'), {current:1, longest:3, activeDays:4});
  assert.deepEqual(summarizeActivity([], '2026-01-03'), {current:0, longest:0, activeDays:0});
});
test('calendar includes full Sunday-first weeks, leap days and year rollover', () => {
  const november = calendarDays('2026-11');
  assert.equal(november.length, 35);
  assert.equal(november[0], '2026-11-01');
  assert.equal(november.at(-1), '2026-12-05');
  assert.ok(calendarDays('2024-02').includes('2024-02-29'));
  assert.ok(calendarDays('2026-01').includes('2025-12-31'));
});
test('learning saves persist a daily mark, retries and rejected inputs do not add activity, history is backfilled', () => {
  const folder = mkdtempSync(join(tmpdir(), 'achievements-'));
  const path = join(folder, 'test.sqlite');
  try {
    assert.equal(readAchievements(path).totalSessions, 0);
    const learning = new LearningStore(path);
    const exercise = new ExerciseStore(path);
    const words = [{id:1, spokenText:'cash', meaning:'tiền mặt'}];
    const request = {id:'flash-event-0001', lesson:'lesson-2', mode:'flashcard', durationMs:10, answers:[{wordId:1,direction:'en-vi',answer:'learning'}]};
    learning.save(request, words);
    learning.save(request, words);
    assert.throws(() => learning.save({...request, id:'invalid-event-01', mode:'invalid'}, words));
    learning.save({...request, id:'writing-event-01', mode:'writing', answers:[{wordId:1,direction:'en-vi',answer:'wrong'}]}, words);
    const unit = {id:'unit-1', title:'Test', pages:[], questions:[{id:'q1',label:'1',answer:'yes'}]};
    const submission = {id:'exercise-event-01', unitId:'unit-1', durationMs:1, answers:{q1:'no'}};
    exercise.save(submission, unit);
    exercise.save(submission, unit);
    learning.close(); exercise.close();
    const db = new DatabaseSync(path);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM activity_days').get()?.n, 1);
    assert.equal(readAchievements(path).totalSessions, 3);
    // Simulate pre-feature history in both independent stores.
    db.exec("DELETE FROM activity_days; UPDATE sessions SET created_at='2026-10-31T16:59:59Z'; UPDATE essential_sessions SET created_at='2026-10-31T17:00:00Z';");
    const data = readAchievements(path, new Date('2026-11-01T18:00:00Z'));
    assert.deepEqual(data.days, ['2026-10-31', '2026-11-01']);
    assert.equal(data.current, 2);
    assert.equal(data.totalSessions, 3);
    assert.deepEqual(readAchievements(path).days, data.days);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM activity_days').get()?.n, 2);
    db.close();
  } finally { rmSync(folder, {recursive:true, force:true}); }
});

test('earned dates survive reopen and forgetting', () => {
 const folder=mkdtempSync(join(tmpdir(),'awards-')); const path=join(folder,'test.sqlite');
 try {
  const learning=new LearningStore(path);
  const words=Array.from({length:10},(_,i)=>({id:i,spokenText:`word${i}`,meaning:`nghĩa ${i}`}));
  for(const word of words) learning.save({id:`flash-award-${word.id}`,lesson:'essential-01',mode:'flashcard',durationMs:0,answers:[{wordId:word.id,direction:'vi-en',answer:'known'}]},words);
  learning.close();
  const db=new DatabaseSync(path);
  db.exec("UPDATE sessions SET created_at='2026-01-01T17:00:00Z'; DELETE FROM activity_days;");
  const first=readAchievements(path,new Date('2026-01-10'));
  assert.equal(first.collection.awards['words:10'],'2026-01-02');
  assert.equal(first.collection.counts.lessons,1);
  const again=new LearningStore(path);
  again.save({id:'forgot-award-0001',lesson:'essential-01',mode:'writing',durationMs:0,answers:[{wordId:0,direction:'vi-en',answer:'wrong'}]},words);
  again.close();
  assert.equal(readAchievements(path).collection.awards['words:10'],'2026-01-02');
  assert.equal(readAchievements(path).collection.counts.words,10);
  assert.equal(db.prepare("SELECT earned_day FROM achievement_awards WHERE id='words:10'").get()?.earned_day,'2026-01-02');
  db.close();
 }finally{rmSync(folder,{recursive:true,force:true});}
});

test('legacy test history uses catalog size and persisted retry metadata', () => {
 const folder=mkdtempSync(join(tmpdir(),'legacy-awards-'));const path=join(folder,'test.sqlite');
 try {
  const store=new LearningStore(path);
  const words=[{id:1,spokenText:'one',meaning:'một'},{id:2,spokenText:'two',meaning:'hai'}];
  const payload={id:'legacy-full-0001',lesson:'lesson-1',mode:'test',durationMs:0,answers:[{wordId:1,direction:'vi-en',answer:'one'},{wordId:2,direction:'vi-en',answer:'two'}]};
  store.save(payload,words);
  store.save({...payload,id:'legacy-short-001',answers:[payload.answers[0]]},words);
  store.close();
  const db=new DatabaseSync(path);
  db.exec("UPDATE sessions SET result=json_remove(result,'$.fullTest')");
  db.close();
  const data=readAchievements(path,new Date(),()=>2);
  assert.equal(data.collection.counts.tests,1);assert.equal(data.collection.counts.perfect,1);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
