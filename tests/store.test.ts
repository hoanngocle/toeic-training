import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LearningStore } from '../lib/learning/store.ts';
const words = [{ id: 1, spokenText: 'cash', meaning: 'tiền mặt' }, { id: 2, spokenText: 'broken', meaning: 'hỏng, bị hỏng' }];
const request = { id: 'test-event-00001', lesson: 'lesson-2', mode: 'test', durationMs: 2500, answers: [{wordId: 1, direction: 'en-vi', answer: 'sai'}, {wordId: 2, direction: 'vi-en', answer: 'broken'}] };

test('SQLite persists grades and progress across reopen; retries do not double-count', () => {
 const folder = mkdtempSync(join(tmpdir(), 'learning-test-'));
 try {
  let store = new LearningStore(join(folder, 'learning.sqlite'));
  const result = store.save(request, words);
  assert.equal(result.score, 1);
  assert.equal(result.results[0].expected, 'tiền mặt');
  store.save(request, words);
  store.close();
  store = new LearningStore(join(folder, 'learning.sqlite'));
  const state = store.read('lesson-2');
  assert.equal(state.sessions.length, 1);
  assert.equal(state.progress.length, 2);
  assert.equal(state.progress[0].incorrect, 1);
  assert.equal(state.progress[1].correct, 1);
  assert.equal(store.read('lesson-3').sessions.length, 0);
  assert.throws(() => store.save({...request, answers: [{wordId:1,direction:'en-vi',answer:'tiền mặt'}]}, words));
  store.close();
 } finally { rmSync(folder, {recursive:true,force:true}); }
});

test('Invalid modes, unknown words, empty writing, duplicate words and oversized answers cannot mutate DB', () => {
 const store = new LearningStore(':memory:');
 try {
  for (const payload of [
   {...request, mode:'invalid'}, {...request, answers:[{wordId:99,direction:'en-vi',answer:'x'}]},
   {...request, mode:'writing', answers:[{wordId:1,direction:'en-vi',answer:' '}]},
   {...request, answers:[request.answers[0],request.answers[0]]},
   {...request, answers:[{wordId:1,direction:'en-vi',answer:'x'.repeat(2001)}]},
   {...request, durationMs:-1}, {...request, answers:[]},
  ]) assert.throws(() => store.save(payload, words));
  assert.equal(store.read('lesson-2').sessions.length, 0);
 } finally {store.close();}
});

test('Flashcard ratings persist and wrong answers put remembered words back into practice', () => {
 const store = new LearningStore(':memory:');
 try {
  store.save({...request,id:'flash-event-0001',mode:'flashcard',answers:[{wordId:1,direction:'en-vi',answer:'known'}]},words);
  assert.equal(store.read('lesson-2').progress[0].status,'learned');
  store.save({...request,id:'writing-event-01',mode:'writing',answers:[{wordId:1,direction:'en-vi',answer:'sai'}]},words);
  const state = store.read('lesson-2');
  assert.equal(state.progress[0].status,'learning');
  assert.equal(state.progress[0].reviews,2);
  assert.equal(state.sessions[0].results[0].answer,'sai');
 } finally {store.close();}
});

test('Essential Word lessons persist independently from original vocabulary lessons', () => {
 const store = new LearningStore(':memory:');
 try {
  for (const lesson of ['essential-01', 'essential-09', 'essential-10', 'essential-49', 'essential-50']) {
   store.save({...request, id: `test-${lesson}`, lesson}, words);
   assert.equal(store.read(lesson).sessions[0].lesson, lesson);
   assert.equal(store.read(lesson).progress.length, 2);
  }
  assert.equal(store.read('lesson-2').sessions.length, 0);
 } finally { store.close(); }
});

test('Malformed and out-of-range Essential Word slugs cannot mutate DB', () => {
 const store = new LearningStore(':memory:');
 try {
  for (const lesson of ['essential-00', 'essential-51', 'essential-1', 'essential-001', 'essential-50-extra', 'Essential-01', 'other-01', '../essential-01']) {
   assert.throws(() => store.save({...request, lesson}, words));
   assert.equal(store.read(lesson).sessions.length, 0);
   assert.equal(store.read(lesson).progress.length, 0);
  }
 } finally { store.close(); }
});

test('full tests earn eligibility but explicit wrong-answer retries never do', () => {
 const store=new LearningStore(':memory:');
 try {
  const first=store.save(request,words);
  assert.equal(first.fullTest,true);
  const retry={...request,id:'retry-event-0001',retryOf:request.id,answers:[{wordId:1,direction:'en-vi',answer:'tiền mặt'}]};
  assert.equal(store.save(retry,words).fullTest,false);
  assert.equal(store.save(retry,words).fullTest,false);
  assert.throws(()=>store.save({...retry,id:'retry-invalid-01',retryOf:'missing-parent-1'},words));
  assert.throws(()=>store.save({...retry,id:'retry-invalid-02',answers:[{wordId:2,direction:'vi-en',answer:'broken'}]},words));
 }finally{store.close();}
});
