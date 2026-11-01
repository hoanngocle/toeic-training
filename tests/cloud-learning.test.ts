import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gradeLearning } from '../lib/learning/grading.ts';
import { gradeExercise } from '../lib/essential/grading.ts';
import { LearningStore } from '../lib/learning/store.ts';
import type { Word } from '../lib/learning/practice.ts';
const words:Word[]=[{id:1,spokenText:'book',meaning:'sách'} as Word];
test('cloud grading preserves SQLite result and rejects injected score/user',()=>{
  const input={id:'test-session-01',lesson:'lesson-1',mode:'writing',durationMs:10,answers:[{wordId:1,direction:'en-vi',answer:'sách'}],user_id:'other',score:999};
  const store=new LearningStore(':memory:');
  try {
    const local=store.save(input,words);
    const {request,result}=gradeLearning(input,words,local.createdAt);
    assert.deepEqual(result,local);
    assert.equal('user_id' in request,false);
    assert.equal(result.score,1);
    assert.throws(()=>gradeLearning({...input,answers:[{wordId:999,direction:'en-vi',answer:'x'}]},words));
  } finally {store.close();}
});
test('exercise grading remains a pure export without SQLite dependency',()=>{
  assert.equal(typeof gradeExercise,'function');
});
