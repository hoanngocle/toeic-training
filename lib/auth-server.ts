import { connection } from "next/server";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySession } from './auth';

export async function isAuthenticated() {
  // Session expiry must be evaluated for a real request, never in a cached shell.
  await connection();
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  if (!await isAuthenticated()) redirect('/login');
}

export async function unauthorizedResponse() {
  return await isAuthenticated() ? null : Response.json({ error: 'Vui lòng đăng nhập.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
