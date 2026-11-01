import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { database,alice,payload,save } from './helpers/progression-db.ts';
import { prepareBackfill } from '../lib/progression/backfill.ts';
import type { BackfillRow } from '../lib/progression/backfill.ts';
test('backfill prepares every historical row and rejects corrupt results or conflicting ledger',()=>{
 const rows:BackfillRow[]=Array.from({length:120},(_,i)=>{const p=payload(`history-row-${i}`);return {id:p.result.id,result:p.result,created_at:p.result.createdAt};});
 const exercises:BackfillRow[]=rows.map(row=>({...row,result:{id:row.id,unitId:'unit-1',durationMs:100,createdAt:row.created_at,total:1,score:1,results:[{questionId:'q1',label:'1',answer:'x',expected:'x',correct:true}]}}));
 const plan=prepareBackfill(rows,exercises,[]);assert.equal(plan.scanned,240);assert.equal(plan.expAdded,7680);
 const entry=plan.entries[0];
 assert.equal(prepareBackfill(rows,exercises,[{source_type:entry.sourceType,source_id:entry.sourceId,amount:32,calculation:entry.calculation,reward_version:'toeic-learning-v1',created_at:entry.createdAt}]).existing,1);
 assert.throws(()=>prepareBackfill([{...rows[0],result:{...rows[0].result,score:0}}],[],[]),/history-row-0/);
 assert.throws(()=>prepareBackfill(rows,[],[{source_type:'vocabulary',source_id:'history-row-0',amount:99,calculation:entry.calculation,reward_version:'toeic-learning-v1',created_at:entry.createdAt}]),/conflict/i);
 assert.equal(prepareBackfill([],[],[]).expAdded,0);
});
test('PostgreSQL backfill is atomic, repeatable, detects stale history and gates new grants',async()=>{
 const db=await database(false);try {
 const p=payload('history-original');
 await db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(p.request),JSON.stringify(p.result)]);
 await db.exec(readFileSync(new URL('../supabase/migrations/202611020001_progression.sql',import.meta.url),'utf8'));
 await assert.rejects(save(db,alice,'new-before-backfill'),/PROGRESSION_BACKFILL_REQUIRED/);
 const rows=(await db.query<BackfillRow>('SELECT id,result,created_at::text FROM public.sessions')).rows;
 const plan=prepareBackfill(rows,[],[]);
 const apply=(entries:unknown)=>db.query('SELECT public.backfill_learning_exp($1,$2::jsonb)',[alice,JSON.stringify(entries)]);
 await assert.rejects(apply([{...plan.entries[0],result:{}}]),/HISTORY_CHANGED/);
 assert.equal((await db.query('SELECT * FROM public.learning_exp_ledger')).rows.length,0);
 await apply(plan.entries);await apply(plan.entries);
 assert.equal((await db.query('SELECT * FROM public.learning_exp_ledger')).rows.length,1);
 assert.equal((await db.query('SELECT * FROM public.progression_backfills')).rows.length,1);
 const replay=await save(db,alice,'history-original');assert.deepEqual(replay.reward,{exp:32,version:'toeic-learning-v1'});assert.equal(replay.progressionTotals,undefined);
 await save(db,alice,'new-after-backfill');
 assert.equal((await db.query('SELECT * FROM public.learning_exp_ledger')).rows.length,2);
 await assert.rejects(apply([{...plan.entries[0],calculation:{...plan.entries[0].calculation,exp:16,baseTotal:8}}]),/REWARD_CONFLICT/);
 await db.exec('SET ROLE authenticated');await assert.rejects(apply(plan.entries),/permission denied/);
 }finally{await db.close();}
});
test('backfill rejects corrupt identity fields and duplicate answer IDs before granting EXP',()=>{
 const p=payload('history-corrupt');
 const row={id:p.result.id,result:p.result,created_at:p.result.createdAt};
 const duplicate={...row,result:{...p.result,total:2,score:2,results:[...p.result.results,...p.result.results]}};
 assert.throws(()=>prepareBackfill([duplicate],[],[]),/history-corrupt/);
 assert.throws(()=>prepareBackfill([{...row,result:{...p.result,lesson:undefined}} as unknown as BackfillRow],[],[]),/history-corrupt/);
 assert.throws(()=>prepareBackfill([{...row,result:{...p.result,durationMs:-1}}],[],[]),/history-corrupt/);
 assert.throws(()=>prepareBackfill([],[{...row,result:{id:row.id,createdAt:row.created_at,total:1,score:1,results:[{correct:true}]}} as BackfillRow],[]),/history-corrupt/);
});
