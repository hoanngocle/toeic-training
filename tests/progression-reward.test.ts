import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateVocabularyReward, calculateEssentialReward } from '../lib/progression/reward.ts';
import type { Session } from '../lib/learning/types.ts';
import type { ExerciseResult } from '../lib/essential/types.ts';
function session(total:number,correct:number,direction='en-vi',mode='test'):Session {
 return {mode,score:mode==='flashcard'?null:correct,total,results:Array.from({length:total},(_,i)=>({correct:i<correct,direction}))} as Session;
}
test('reward is calculated once from total base, direction and continuous score tiers',()=>{
 assert.equal(calculateVocabularyReward(session(1,1)).exp,32);
 assert.equal(calculateVocabularyReward(session(1,1,'vi-en')).exp,36);
 assert.equal(calculateVocabularyReward(session(20,18)).exp,480);
 assert.equal(calculateVocabularyReward(session(20,20)).exp,640);
 assert.equal(calculateVocabularyReward(session(20,0)).exp,0);
 assert.equal(calculateVocabularyReward(session(1,1,'en-vi','flashcard')).exp,0);
 const mix=session(2,2);mix.results[0].direction='vi-en';assert.equal(calculateVocabularyReward(mix).exp,68);
 for(const [correct,multiplier] of [[99,.5],[100,.7],[179,.7],[180,1.5],[199,1.5],[200,2]])assert.equal(calculateVocabularyReward(session(200,correct)).scoreMultiplier,multiplier);
 assert.equal(calculateEssentialReward(session(3,3) as unknown as ExerciseResult).exp,96);
 assert.equal(calculateEssentialReward(session(1,1) as unknown as ExerciseResult).exp,32);
 for(const broken of [session(0,0),{...session(1,1),score:0},{...session(1,1),total:NaN},session(1,1,'bad'),{...session(1,1),results:[{correct:'true',direction:'en-vi'}]}])assert.throws(()=>calculateVocabularyReward(broken as Session));
});
