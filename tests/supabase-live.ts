// Explicit opt-in smoke test. Creates temporary users, deletes only those users in finally.
// Run against a LOCAL Next server configured with the SAME Supabase project.
import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const app=process.env.SMOKE_APP_URL??'http://127.0.0.1:3125';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
if(!url||!key||!secret) throw new Error('Configure Supabase env before running the live smoke test.');
if(!['127.0.0.1','localhost'].includes(new URL(app).hostname)) throw new Error('SMOKE_APP_URL must be a local test server.');
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const created:string[]=[];
const password=randomBytes(24).toString('base64url');
const stamp=randomUUID();
const accounts=[0,1].map(i=>({email:`codex-smoke-${stamp}-${i}@example.com`,password}));
const cookies:string[]=[];
const assertOk=(error:unknown)=>{assert.equal(error,null);};
async function call(path:string,index:number|null,body?:unknown,method=body?'POST':'GET') {
 const response=await fetch(app+path,{method,redirect:'manual',headers:{...(index===null?{}:{Cookie:cookies[index]}),Origin:app,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return response;
}
try {
 for(const account of accounts){
  const {data,error}=await admin.auth.admin.createUser({...account,email_confirm:true});assertOk(error);created.push(data.user!.id);
 }
 assertOk((await admin.from('profiles').update({role:'admin'}).eq('id',created[0])).error);
 for(const account of accounts){
  const response=await fetch(app+'/api/auth/login',{method:'POST',headers:{Origin:app,'Content-Type':'application/json'},body:JSON.stringify(account)});
  assert.equal(response.status,200);
  const values=response.headers.getSetCookie();assert.ok(values.some(value=>value.includes('HttpOnly')));
  cookies.push(values.map(value=>value.split(';')[0]).join('; '));
 }
 assert.equal((await call('/api/admin/users',0)).status,200);
 assert.equal((await call('/api/admin/users',1)).status,403);
 assert.equal((await call('/api/admin/users',null)).status,401);
 const data=JSON.parse(readFileSync(new URL('../data/vocabulary/lessons.json',import.meta.url),'utf8'));
 const lesson=data[0],word=lesson.words[0];
 const request={id:`smoke-${stamp}`,lesson:lesson.slug,mode:'writing',durationMs:1000,answers:[{wordId:word.id,direction:'en-vi',answer:word.meaning}]};
 const results=await Promise.all([call('/api/learning',0,request),call('/api/learning',0,request)]);
 for(const response of results) assert.equal(response.status,200);
 const alice=await (await call(`/api/learning?lesson=${lesson.slug}`,0)).json();
 assert.equal(alice.progress[0].reviews,1);assert.equal(alice.totalSessions,1);
 const bob=await (await call(`/api/learning?lesson=${lesson.slug}`,1)).json();
 assert.deepEqual(bob.progress,[]);assert.equal(bob.totalSessions,0);
 assert.equal((await call('/api/learning',1,request)).status,200);
 const userClient=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 assertOk((await userClient.auth.signInWithPassword(accounts[1])).error);
 assert.equal((await userClient.from('sessions').select('id').eq('user_id',created[0])).data?.length,0);
 assert.ok((await userClient.rpc('save_learning',{p_user_id:created[0],p_request:request,p_result:{}})).error);
 assert.equal((await call(`/api/admin/users/${created[1]}`,0,{action:'disable'},'PATCH')).status,200);
 assert.equal((await call(`/api/learning?lesson=${lesson.slug}`,1)).status,401);
 assert.equal((await userClient.from('sessions').select('id')).data?.length,0);
 for(const path of ['/tu-vung',`/tu-vung/${lesson.slug}`,'/achievements']) {
  const response=await call(path,1);const body=await response.text();
  const redirect=response.headers.get('location')??body;
  assert.ok(redirect.includes('/login?next=')||redirect.includes('/login?next%3D'),`Blocked page: ${path}`);
 }
 assert.equal((await call(`/api/admin/users/${created[0]}`,0,{action:'disable'},'PATCH')).status,403);
 assert.equal((await call(`/api/admin/users/${created[1]}`,0,{action:'enable'},'PATCH')).status,200);
 const newPassword=randomBytes(24).toString('base64url');
 assert.equal((await call(`/api/admin/users/${created[1]}`,0,{action:'password',password:newPassword},'PATCH')).status,200);
 assert.ok((await userClient.auth.signInWithPassword(accounts[1])).error);
 assertOk((await userClient.auth.signInWithPassword({...accounts[1],password:newPassword})).error);
 const logout=await call('/api/auth/logout',0,{},'POST');assert.equal(logout.status,303);
 assert.ok(logout.headers.getSetCookie().some(value=>value.includes('Max-Age=0')));
 const anonymous=await call('/achievements',null);const text=await anonymous.text();
 assert.ok((anonymous.headers.get('location')??text).includes('/login?next=%2Fachievements'));
 console.log('PASS: real Supabase login/cookies, admin authorization, concurrent saves, isolated progress/RLS, lock/unlock, reset password, logout and safe return path.');
} finally {
 let cleanupFailed=false;
 for(const id of created){const {error}=await admin.auth.admin.deleteUser(id);if(error){cleanupFailed=true;console.error('Temporary smoke account needs cleanup:',id);}}
 if(cleanupFailed) process.exitCode=1;
 else console.log(`Cleanup: removed ${created.length} temporary test accounts and their learning rows.`);
}
