import assert from 'node:assert/strict';
import { test } from 'node:test';
import { progressionResult } from '../lib/progression/cloud.ts';
test('transaction totals produce a level-up once; replay has no transition',()=>{
 const result=progressionResult({id:'x',reward:{exp:32,version:'toeic-learning-v1'},progressionTotals:{before:280,after:312}});
 assert.equal(result.progressionChange?.before.level,1);assert.equal(result.progressionChange?.after.level,2);
 assert.equal('progressionTotals' in result,false);
 assert.equal(progressionResult({reward:result.reward}).progressionChange,undefined);
 assert.throws(()=>progressionResult({progressionTotals:{before:1,after:-1}}));
});
