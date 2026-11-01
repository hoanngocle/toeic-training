import test from 'node:test';
import assert from 'node:assert/strict';
import { ExerciseStore, gradeExercise, ExerciseInputError } from '../lib/essential/store.ts';
import type { BookUnit, ExerciseRequest } from '../lib/essential/types.ts';

const unit: BookUnit = {id:'review-01',title:'Word Review #1',pages:[],questions:[
  {id:'1',label:'Câu 1',choices:['A','B','C','D'],answer:'B'},
  {id:'2',label:'Câu 2',answer:'abide by'},
]};
const request: ExerciseRequest = {id:'attempt-123456',unitId:'review-01',durationMs:1000,answers:{'1':' b ','2':' ABIDE   BY '}};
test('grades original answer keys, with casing and whitespace normalized',()=>{
  const result=gradeExercise(request,unit);
  assert.equal(result.score,2);assert.equal(result.total,2);
  assert.equal(result.results[1].expected,'abide by');
});
test('retry grades only chosen questions and retains original question identifiers',()=>{
  const result=gradeExercise({...request,answers:{'2':'agreement'}},unit,['2']);
  assert.equal(result.score,0);assert.equal(result.total,1);assert.equal(result.results[0].questionId,'2');
});
test('accepts either alternative explicitly allowed by the book key',()=>{
  const alternatives={...unit,questions:[{id:'1',label:'Câu 1',answer:'achievements/merits'},{id:'2',label:'Câu 2',answer:'conservative (or aggressive)'}]};
  assert.equal(gradeExercise({...request,answers:{'1':'merits','2':'aggressive'}},alternatives).score,2);
  assert.equal(gradeExercise({...request,answers:{'1':'achievements','2':'conservative'}},alternatives).score,2);
  assert.equal(gradeExercise({...request,answers:{'1':'achievement','2':'conservatively'}},alternatives).score,0);
});
test('rejects unknown questions, empty submissions, wrong units and invalid options',()=>{
  for(const input of [{...request,answers:{}},{...request,answers:{'1':'B'}},{...request,answers:{'9':'B'}},{...request,answers:{'1':''}},{...request,answers:{'1':'Z'}},{...request,unitId:'review-02'},{...request,durationMs:-1},{...request,answers:['B']}])
    assert.throws(()=>gradeExercise(input,unit),ExerciseInputError);
});
test('only saved incorrect questions can be submitted as a scoped retry',()=>{
  const store=new ExerciseStore(':memory:');
  try {
    store.save({...request,answers:{'1':'B','2':'agreement'}},unit);
    const retry={...request,id:'attempt-987654',retryOf:request.id,answers:{'2':'abide by'}};
    assert.equal(store.save(retry,unit).score,1);
    assert.throws(()=>store.save({...retry,id:'attempt-111111',retryOf:'not-existing-id'},unit),ExerciseInputError);
    assert.throws(()=>store.save({...retry,id:'attempt-222222',answers:{'1':'B'}},unit),ExerciseInputError);
    assert.throws(()=>store.save({...retry,id:'attempt-333333',retryOf:retry.id},unit),ExerciseInputError);
  } finally {store.close();}
});
test('SQLite saves once, survives re-read, isolates review groups and rejects id collisions',()=>{
  const store=new ExerciseStore(':memory:');
  try {
    const result=store.save(request,unit); assert.deepEqual(store.save(request,unit),result);
    assert.equal(store.read('review-01').length,1);assert.equal(store.read('review-02').length,0);
    assert.equal(store.read('review-01')[0].score,2);
    assert.throws(()=>store.save({...request,answers:{'1':'A'}},unit),ExerciseInputError);
    assert.equal(store.read('review-01').length,1);
  } finally {store.close();}
});
