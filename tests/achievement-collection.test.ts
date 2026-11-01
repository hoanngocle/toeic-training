import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCollection, CATEGORIES } from '../lib/achievements/collection.ts';
import type { AchievementEvent } from '../lib/achievements/collection.ts';
const event = (id: string, day: string, extra: Partial<AchievementEvent> = {}): AchievementEvent => ({id, at:`${day}T03:00:00Z`, lesson:'essential-01', answers:[], ...extra});
test('43 badges count unique lessons, full attempts and distinct perfect tests independently', () => {
 const result = buildCollection([
  event('a','2026-01-01',{test:'vocab:essential-01',fullTest:true,perfect:true}),
  event('b','2026-01-02',{test:'vocab:essential-01',fullTest:true,perfect:true}),
  event('c','2026-01-03',{test:'exercise:essential-01-reading',fullTest:false,perfect:true}),
  event('d','2026-01-04',{lesson:'essential-02',test:'exercise:essential-02-reading',fullTest:true,perfect:false}),
 ]);
 assert.equal(CATEGORIES.flatMap(c=>c.milestones).length,43);
 assert.equal(result.counts.lessons,2); assert.equal(result.counts.tests,3); assert.equal(result.counts.perfect,1);
 assert.equal(result.awards['sessions:1'],'2026-01-01'); assert.equal(result.awards['streak:3'],'2026-01-03');
 assert.equal(result.awards['perfect:1'],'2026-01-01');
});
test('ever-mastered words survive forgetting and are counted once per lesson entry', () => {
 const events = Array.from({length:10},(_,i)=>event(`known-${i}`,'2026-01-01',{mode:'flashcard',answers:[{wordId:i,correct:true}]}));
 events.push(event('forgot','2026-01-02',{mode:'writing',answers:[{wordId:0,correct:false}]}));
 events.push(event('remember','2026-01-03',{mode:'flashcard',answers:[{wordId:0,correct:true}]}));
 const result=buildCollection(events);
 assert.equal(result.counts.words,10); assert.equal(result.awards['words:10'],'2026-01-01');
});
test('three consecutive correct answers earn mastery; incorrect answer resets the run', () => {
 const events=[true,true,false,true,true,true].map((correct,i)=>event(String(i),'2026-01-01',{mode:'writing',answers:[{wordId:1,correct}]}));
 assert.equal(buildCollection(events.slice(0,5)).counts.words,0);
 assert.equal(buildCollection(events).counts.words,1);
});
test('chronological sorting, Vietnam dates and daily dedup preserve longest streak', () => {
 const result=buildCollection([event('d','2026-01-10'),event('c','2026-01-03'),event('a','2026-01-01'),event('b','2026-01-02'),event('e','2026-01-02')]);
 assert.equal(result.counts.streak,3); assert.equal(result.counts.days,4);
 assert.equal(result.awards['streak:3'],'2026-01-03');
 assert.equal(buildCollection([event('x','2026-01-01',{at:'2026-01-01T17:01:00Z'})]).awards['sessions:1'],'2026-01-02');
});
