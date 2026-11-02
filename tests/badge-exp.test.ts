import assert from 'node:assert/strict';
import { test } from 'node:test';
import { badgeBonusPercent, collectionBonusPercent } from '../lib/achievements/bonus.ts';
import { CATEGORIES } from '../lib/achievements/collection.ts';
import { applyBadgeBonus } from '../lib/progression/reward.ts';
import { prepareBackfill } from '../lib/progression/backfill.ts';
import { database, alice, bob, payload } from './helpers/progression-db.ts';
import { saveLearning, saveExercise } from '../lib/supabase/learning.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Word } from '../lib/learning/practice.ts';

const base={exp:640,version:'toeic-learning-v1',questionCount:20,correctCount:20,baseTotal:320,scoreMultiplier:2};

test('badge bonuses step by 0.5% through every tier and add all earned badges',()=>{
 assert.deepEqual(Array.from({length:7},(_,tier)=>badgeBonusPercent(tier)),[0.5,1,1.5,2,2.5,3,3.5]);
 assert.equal(collectionBonusPercent({}),0);
 assert.equal(collectionBonusPercent({'sessions:1':'2026-11-01','sessions:10':'2026-11-01','sessions:50':'2026-11-01'}),3);
 assert.equal(collectionBonusPercent({'sessions:50':'2026-11-01','lessons:1':'2026-11-01','invalid:1':'2026-11-01'}),2);
 const all=Object.fromEntries(CATEGORIES.flatMap(c=>c.milestones.map(v=>[`${c.id}:${v}`,'2026-11-01'])));
 assert.equal(collectionBonusPercent(all),77);
});

test('backfill preserves a stored bonus snapshot instead of recomputing historical EXP',()=>{
 const p=payload('badge-backfill-001');
 const calculation=applyBadgeBonus(p.result.rewardCalculation,77);
 const row={id:p.result.id,created_at:p.result.createdAt,result:p.result};
 const ledger={source_type:'vocabulary',source_id:row.id,amount:calculation.exp,reward_version:calculation.version,calculation,created_at:row.created_at};
 const plan=prepareBackfill([row],[],[ledger]);
 assert.equal(plan.existing,1);assert.equal(plan.expAdded,0);assert.deepEqual(plan.entries[0].calculation,calculation);
 assert.throws(()=>prepareBackfill([row],[],[{...ledger,amount:999}]),/conflict/i);
});

test('PostgreSQL stores uncapped badge rewards once, replays metadata, and rejects invalid calculations',async()=>{
 const db=await database();
 try {
  const p=payload('badge-reward-001');
  const calculation=applyBadgeBonus(p.result.rewardCalculation,77);
  const submit=(user=alice,calc=calculation,id=p.request.id)=>db.query<{result:{reward:unknown}}>('SELECT public.save_learning($1,$2::jsonb,$3::jsonb) AS result',[user,JSON.stringify({...p.request,id}),JSON.stringify({...p.result,id,rewardCalculation:calc})]);
  const saved=(await submit()).rows[0].result;
  assert.deepEqual(saved.reward,{exp:56,version:'toeic-learning-badges-v2',baseExp:32,badgeBonusPercent:77,bonusExp:24});
  assert.deepEqual((await submit(alice,applyBadgeBonus(p.result.rewardCalculation,0))).rows[0].result.reward,saved.reward);
  const ledger=(await db.query<{calculation:unknown}>('SELECT amount,calculation FROM public.learning_exp_ledger')).rows;
  assert.equal(ledger.length,1);assert.deepEqual(ledger[0].calculation,calculation);
  await submit(bob,applyBadgeBonus(p.result.rewardCalculation,0));
  const exerciseRequest={id:'badge-exercise-db',unitId:'review-01',durationMs:100,answers:{q:'yes'}};
  const exerciseResult={id:exerciseRequest.id,unitId:'review-01',durationMs:100,createdAt:p.result.createdAt,total:1,score:1,results:[{questionId:'q',label:'1',answer:'yes',expected:'yes',correct:true}],rewardCalculation:calculation};
  const saveExercise=()=>db.query<{result:{reward:unknown}}>('SELECT public.save_exercise($1,$2::jsonb,$3::jsonb) AS result',[alice,JSON.stringify(exerciseRequest),JSON.stringify(exerciseResult)]);
  assert.deepEqual((await saveExercise()).rows[0].result.reward,saved.reward);
  assert.deepEqual((await saveExercise()).rows[0].result.reward,saved.reward);
  const stored=(await db.query<{result:typeof p.result}>('SELECT result FROM public.sessions WHERE user_id=$1 AND id=$2',[alice,p.request.id])).rows[0].result;
  const plan=prepareBackfill([{id:p.result.id,created_at:p.result.createdAt,result:stored}],[],[{source_type:'vocabulary',source_id:p.result.id,amount:calculation.exp,reward_version:calculation.version,calculation,created_at:p.result.createdAt}]);
  await db.query('SELECT public.backfill_learning_exp($1,$2::jsonb)',[alice,JSON.stringify(plan.entries)]);
  for(const bad of [{...calculation,exp:57},{...calculation,badgeBonusPercent:-1},{...calculation,badgeBonusPercent:0.1},{...calculation,bonusExp:25},{...calculation,baseExp:33},{...calculation,bonusExp:undefined}]) {
   await assert.rejects(submit(alice,bad,'badge-invalid-001'),/INVALID_REWARD/);
  }
  assert.equal((await db.query("SELECT * FROM public.sessions WHERE id='badge-invalid-001'")).rows.length,0);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(submit(),/permission denied/);
 } finally {await db.close();}
});

test('bonus receipts retain base EXP, floor once, have no cap, and leave legacy rewards intact',()=>{
 assert.deepEqual(applyBadgeBonus(base,3),{...base,version:'toeic-learning-badges-v2',exp:659,baseExp:640,badgeBonusPercent:3,bonusExp:19});
 assert.equal(applyBadgeBonus({...base,exp:32,baseTotal:16,questionCount:1,correctCount:1},0.5).exp,32);
 assert.equal(applyBadgeBonus(base,20).exp,768);
 assert.equal(applyBadgeBonus(base,77).exp,1132);
 assert.equal(applyBadgeBonus({...base,exp:0,scoreMultiplier:0},20).exp,0);
 assert.equal(base.exp,640);assert.equal(base.version,'toeic-learning-v1');
 for(const percent of [-1,0.1,NaN,Infinity,Number.MAX_SAFE_INTEGER]) assert.throws(()=>applyBadgeBonus(base,percent));
});

test('both server submissions derive bonuses from trusted saved badges and ignore client bonus fields',async()=>{
 const calls:{name:string;args:Record<string,unknown>}[]=[];
 const awards=[{id:'sessions:1',earned_day:'2026-11-01'},{id:'sessions:10',earned_day:'2026-11-01'},{id:'sessions:50',earned_day:'2026-11-01'}];
 const writer={
  from(table:string){
   const previous=payload('badge-history-001');
   const history=[{id:previous.result.id,sequence:1,created_at:previous.result.createdAt,lesson:'essential-01',mode:'test',request:previous.request,result:{...previous.result,fullTest:undefined,mode:'test',total:12,score:12,results:Array.from({length:12},(_,i)=>({...previous.result.results[0],wordId:i+1}))}}];
   const query={select(){return query;},eq(column:string,value:string){assert.equal(column,'user_id');assert.equal(value,alice);return query;},order(){return query;},range(){return query;},
    then(resolve:(value:unknown)=>unknown){return Promise.resolve({data:table==='achievement_awards'?awards:table==='sessions'?history:[],error:null}).then(resolve);}};
   return query;
  },
  async rpc(name:string,args:Record<string,unknown>){calls.push({name,args});return {data:args.p_result,error:null};},
 } as unknown as SupabaseClient;
 const p=payload('badge-server-001');
 await saveLearning(writer,alice,{...p.request,badgeBonusPercent:999,rewardCalculation:{exp:999}},[{id:1,spokenText:'book',meaning:'sách'} as Word],()=>12);
 await saveExercise(writer,writer,alice,{id:'badge-exercise-001',unitId:'review-01',durationMs:100,answers:{'1':'yes'},badgeBonusPercent:999},{id:'review-01',title:'Review',pages:[],questions:[{id:'1',label:'1',answer:'yes'}]},()=>12);
 assert.deepEqual(calls.map(c=>c.name),['save_learning','save_exercise']);
 for(const call of calls){
  const result=call.args.p_result as {rewardCalculation:{badgeBonusPercent:number;exp:number;version:string}};
  assert.equal(result.rewardCalculation.badgeBonusPercent,4.5);
  assert.equal(result.rewardCalculation.exp,33);
  assert.equal(result.rewardCalculation.version,'toeic-learning-badges-v2');
 }
});
