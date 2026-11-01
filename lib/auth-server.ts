import 'server-only';
import { cache } from 'react';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { loginDestination } from './auth';
import { redirect } from 'next/navigation';
import { userClient } from './supabase/server';
import { hasSupabaseConfig } from './supabase/config';
import { activeUser, assertAdmin } from './accounts/policy';

// React cache deduplicates only within this render/request, never across accounts.
export const getCurrentUser=cache(async()=>{
  await connection();
  if (!hasSupabaseConfig()) return null;
  const client=await userClient();
  const {data:{user},error}=await client.auth.getUser();
  if (error || !user) return null;
  const {data:profile,error:profileError}=await client.from('profiles').select('id,role,disabled').eq('id',user.id).maybeSingle();
  if (profileError) throw new Error('Unable to read account profile. Check Supabase migrations.');
  return activeUser(user,profile);
});
export async function isAuthenticated() { return Boolean(await getCurrentUser()); }
export async function requireUser() {
  const user=await getCurrentUser();
  if (!user) redirect(loginDestination((await headers()).get('x-app-return-path')));
  return user;
}
export async function requireAdmin() {
  const user=await requireUser();
  if (user.role!=='admin') redirect('/');
  return user;
}
export async function requireApiUser(admin=false) {
  const user=await getCurrentUser();
  if (admin) assertAdmin(user);
  if (!user) return null;
  return user;
}
export async function unauthorizedResponse() {
  return await getCurrentUser()?null:Response.json({error:'Vui lòng đăng nhập.'},{status:401,headers:{'Cache-Control':'no-store'}});
}
