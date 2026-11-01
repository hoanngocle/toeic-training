import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
async function database() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
  await db.exec(readFileSync(new URL('../supabase/migrations/202611010001_accounts.sql', import.meta.url), 'utf8'));
  await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2),($3,$4)', [alice,'alice@example.com',bob,'bob@example.com']);
  return db;
}
function payload(id='session-000001', correct=true) {
  return {request:{id,lesson:'lesson-1',mode:'writing',durationMs:100,answers:[{wordId:1,direction:'en-vi',answer:'test'}]},
    result:{id,lesson:'lesson-1',mode:'writing',durationMs:100,createdAt:'2026-11-01T18:00:00.000Z',score:Number(correct),total:1,results:[{wordId:1,correct}]}};
}
async function save(db: PGlite, user=alice, id='session-000001', correct=true) {
  const {request,result}=payload(id,correct);
  return db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb) AS result',[user,JSON.stringify(request),JSON.stringify(result)]);
}
async function asUser(db: PGlite, user:string) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);
  await db.exec('SET ROLE authenticated');
}
test('RLS isolates users, denies direct writes and blocks existing tokens after locking', async()=>{
  const db=await database();
  try {
    await save(db); await save(db,bob);
    await asUser(db,alice);
    assert.equal((await db.query('SELECT * FROM public.sessions')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.profiles')).rows.length,1);
    await assert.rejects(db.exec("UPDATE public.profiles SET role='admin'"), /permission denied/);
    await assert.rejects(db.exec("UPDATE public.progress SET correct=999"), /permission denied/);
    await assert.rejects(save(db,bob), /permission denied/);
    await db.exec('RESET ROLE');
    await db.query('UPDATE public.profiles SET disabled=true WHERE id=$1',[alice]);
    await asUser(db,alice);
    assert.equal((await db.query('SELECT * FROM public.sessions')).rows.length,0);
    await db.exec('RESET ROLE');
    await assert.rejects(save(db,alice,'session-000002'), /ACCOUNT_DISABLED/);
    await db.exec('SET ROLE anon');
    await assert.rejects(db.exec('SELECT * FROM public.sessions'), /permission denied/);
  } finally {await db.close();}
});
test('transactions are idempotent per user, reject conflicts, preserve grading counters and roll back',async()=>{
  const db=await database();
  try {
    await db.exec('SET ROLE service_role');
    await Promise.all([save(db), save(db)]);
    assert.equal((await db.query<{reviews:number}>('SELECT reviews FROM public.progress')).rows[0].reviews,1);
    const {request,result}=payload(); request.durationMs=200;
    await assert.rejects(db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(request),JSON.stringify(result)]),/REQUEST_CONFLICT/);
    await save(db,bob);
    assert.equal((await db.query('SELECT * FROM public.sessions')).rows.length,2);
    await save(db,alice,'session-000002'); await save(db,alice,'session-000003');
    assert.equal((await db.query<{status:string}>('SELECT status FROM public.progress WHERE user_id=$1',[alice])).rows[0].status,'learned');
    await save(db,alice,'session-000004',false);
    assert.equal((await db.query<{streak:number}>('SELECT streak FROM public.progress WHERE user_id=$1',[alice])).rows[0].streak,0);
    assert.equal((await db.query<{day:string}>('SELECT day::text FROM public.activity_days WHERE user_id=$1',[alice])).rows[0].day,'2026-11-02');
    const bad=payload('session-invalid'); bad.result.results[0].wordId=NaN;
    await assert.rejects(db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(bad.request),JSON.stringify(bad.result)]));
    assert.equal((await db.query("SELECT * FROM public.sessions WHERE id='session-invalid'")).rows.length,0);
  } finally {await db.close();}
});
test('exercise retries cannot borrow another user\'s parent',async()=>{
  const db=await database();
  try {
    const req={id:'exercise-00001',unitId:'unit-1',durationMs:100,answers:{q1:'x'}};
    const res={...req,createdAt:'2026-11-01T10:00:00Z',score:0,total:1,results:[{questionId:'q1',correct:false}]};
    await db.query('SELECT public.save_exercise($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(req),JSON.stringify(res)]);
    const retry={...req,id:'exercise-00002',retryOf:req.id};
    await assert.rejects(db.query('SELECT public.save_exercise($1,$2::jsonb,$3::jsonb)',[bob,JSON.stringify(retry),JSON.stringify({...res,id:retry.id})]),/RETRY_NOT_FOUND/);
    await db.query('SELECT public.save_exercise($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(retry),JSON.stringify({...res,id:retry.id})]);
    assert.equal((await db.query('SELECT * FROM public.essential_sessions')).rows.length,2);
  } finally {await db.close();}
});
test('vocabulary retries require the same user, test parent and exact wrong-word scope',async()=>{
 const db=await database();
 try {
  const parent=payload('session-parent',false);parent.request.mode='test';parent.result.mode='test';
  await db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(parent.request),JSON.stringify(parent.result)]);
  const {request,result}=payload('session-retry');
  const retry={...request,mode:'test',retryOf:'session-parent'};
  await assert.rejects(db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[bob,JSON.stringify(retry),JSON.stringify(result)]),/RETRY_NOT_FOUND/);
  await db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify(retry),JSON.stringify(result)]);
  await assert.rejects(db.query('SELECT public.save_learning($1,$2::jsonb,$3::jsonb)',[alice,JSON.stringify({...retry,id:'retry-invalid',answers:[{wordId:2,answer:'x'}]}),JSON.stringify(result)]),/RETRY_NOT_FOUND/);
 } finally {await db.close();}
});
test('legacy import is atomic, requires admin target and detects repeat/conflicting imports',async()=>{
 const db=await database();
 try {
  await db.exec(readFileSync(new URL('../supabase/migrations/202611010002_legacy_import.sql',import.meta.url),'utf8'));
  const p=payload('legacy-session');
  const snapshot={sessions:[{id:p.request.id,lesson:'lesson-1',mode:'writing',created_at:p.result.createdAt,request:p.request,result:p.result,sequence:1}],progress:[],essential_sessions:[],activity_days:[],achievement_awards:[]};
  const args=[alice,JSON.stringify(snapshot),'a'.repeat(64)];
  await assert.rejects(db.query('SELECT public.import_legacy_learning($1,$2::jsonb,$3)',args),/ADMIN_TARGET_REQUIRED/);
  await db.query("UPDATE public.profiles SET role='admin' WHERE id=$1",[alice]);
  await db.exec('SET ROLE service_role');
  await db.query('SELECT public.import_legacy_learning($1,$2::jsonb,$3)',args);
  await save(db,alice,'after-import-01');
  await db.query('SELECT public.import_legacy_learning($1,$2::jsonb,$3)',args);
  assert.equal((await db.query('SELECT * FROM public.sessions')).rows.length,2);
  await assert.rejects(db.query('SELECT public.import_legacy_learning($1,$2::jsonb,$3)',[alice,JSON.stringify(snapshot),'b'.repeat(64)]),/IMPORT_CONFLICT/);
  await db.exec('RESET ROLE');await db.query("UPDATE public.profiles SET role='admin' WHERE id=$1",[bob]);
  const broken={...snapshot,progress:[{lesson:'lesson-1',word_id:null}]};
  await assert.rejects(db.query('SELECT public.import_legacy_learning($1,$2::jsonb,$3)',[bob,JSON.stringify(broken),'c'.repeat(64)]));
  assert.equal((await db.query('SELECT * FROM public.sessions WHERE user_id=$1',[bob])).rows.length,0);
  await asUser(db,bob);await assert.rejects(db.query('SELECT public.import_legacy_learning($1,$2::jsonb,$3)',args),/permission denied/);
 }finally{await db.close();}
});
