import assert from 'node:assert/strict';
import { test } from 'node:test';
import { database,alice,bob,payload,save } from './helpers/progression-db.ts';
test('ledger commits with learning and exercises, replays once and isolates accounts',async()=>{
 const db=await database();try{
 await db.exec('SET ROLE service_role');
 const first=await save(db);assert.deepEqual(first.reward,{exp:32,version:'toeic-learning-v1'});assert.deepEqual(first.progressionTotals,{before:0,after:32});
 const replay=await save(db);assert.deepEqual(replay.reward,first.reward);assert.equal(replay.progressionTotals,undefined);
 const p=payload();await assert.rejects(db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify({...p.request,durationMs:200}),JSON.stringify(p.result)]),/REQUEST_CONFLICT/);
 await save(db,bob);
 const req={id:p.request.id,unitId:'unit-1',answers:{q:'x'}};
 const res={id:req.id,unitId:'unit-1',createdAt:p.result.createdAt,total:1,score:1,results:[{questionId:'q',correct:true}],rewardCalculation:p.result.rewardCalculation};
 await db.query('SELECT public.save_exercise($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(req),JSON.stringify(res)]);
 assert.equal((await db.query('SELECT * FROM public.learning_exp_ledger')).rows.length,3);
 assert.equal(Number((await db.query<{total:string}>('SELECT sum(amount) AS total FROM public.learning_exp_ledger WHERE user_id=$1',[alice])).rows[0].total),64);
 await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[alice]);await db.exec('SET ROLE authenticated');
 assert.equal((await db.query('SELECT * FROM public.learning_exp_ledger')).rows.length,2);
 await assert.rejects(db.exec('UPDATE public.learning_exp_ledger SET amount=999'),/permission denied/);
 await assert.rejects(save(db),/permission denied/);
 await db.exec('RESET ROLE');await db.query('UPDATE public.profiles SET disabled=true WHERE id=$1',[alice]);await db.exec('SET ROLE authenticated');
 assert.equal((await db.query('SELECT * FROM public.learning_exp_ledger')).rows.length,0);
 }finally{await db.close();}
});
test('ledger failures roll back sessions, counters and activity; duplicates serialize',async()=>{
 const db=await database();try{
 await db.exec(`CREATE FUNCTION public.reject_exp() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced failure'; END $$;
 CREATE TRIGGER fail_exp BEFORE INSERT ON public.learning_exp_ledger FOR EACH ROW EXECUTE FUNCTION public.reject_exp();`);
 await assert.rejects(save(db),/forced failure/);
 for(const table of ['sessions','progress','activity_days','learning_exp_ledger'])assert.equal((await db.query(`SELECT * FROM public.${table}`)).rows.length,0);
 await db.exec('DROP TRIGGER fail_exp ON public.learning_exp_ledger');
 await Promise.all([save(db),save(db)]);
 assert.equal((await db.query('SELECT * FROM public.learning_exp_ledger')).rows.length,1);
 const p=payload('progression-flash');p.request.mode='flashcard';p.result.mode='flashcard';p.result.score=null;p.result.rewardCalculation.exp=0;p.result.rewardCalculation.scoreMultiplier=0;
 await db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(p.request),JSON.stringify(p.result)]);
 assert.equal((await db.query('SELECT * FROM public.learning_exp_ledger WHERE amount=0')).rows.length,1);
 const bad=payload('progression-invalid');bad.result.rewardCalculation.exp=-1;
 await assert.rejects(db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(bad.request),JSON.stringify(bad.result)]),/INVALID_REWARD/);
 }finally{await db.close();}
});
