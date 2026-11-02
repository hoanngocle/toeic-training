import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { gradeLearning } from '../../lib/learning/grading.ts';
import { calculateVocabularyReward } from '../../lib/progression/reward.ts';
import type { Word } from '../../lib/learning/practice.ts';
export const alice='00000000-0000-4000-8000-000000000001';
export const bob='00000000-0000-4000-8000-000000000002';
export async function database(progression=true) {
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
 for(const name of ['202611010001_accounts.sql','202611010002_legacy_import.sql',...(progression?['202611020001_progression.sql','202611020002_badge_exp.sql']:[])])await db.exec(readFileSync(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8'));
 await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2),($3,$4)',[alice,'a@example.com',bob,'b@example.com']);
 return db;
}
export function payload(id='progression-0001') {
 const graded=gradeLearning({id,lesson:'lesson-1',mode:'writing',durationMs:100,answers:[{wordId:1,direction:'en-vi',answer:'sách'}]},[{id:1,spokenText:'book',meaning:'sách'} as Word],'2026-11-01T12:00:00.000Z');
 return {...graded,result:{...graded.result,rewardCalculation:calculateVocabularyReward(graded.result)}};
}
export async function save(db:PGlite,user=alice,id='progression-0001') {
 const {request,result}=payload(id);
 return (await db.query<{result:Record<string,unknown>}>('SELECT public.save_learning($1,$2::jsonb,$3::jsonb) AS result',[user,JSON.stringify(request),JSON.stringify(result)])).rows[0].result;
}
