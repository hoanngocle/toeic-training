import { NextResponse } from 'next/server';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE, verifyCredentials } from '../../../../lib/auth';
import { hasValidOrigin } from '../../../../lib/request-origin';

// A single-account app: limit failed attempts per server process, independent of spoofed IP headers.
let failures = 0;
let resetAt = 0;
export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
  const now = Date.now();
  if (now >= resetAt) { failures = 0; resetAt = now + 60_000; }
  if (failures >= 5) return NextResponse.json({ error: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau một phút.' }, { status: 429, headers: { 'Retry-After': '60' } });
  try {
    const text = await request.text();
    if (text.length > 2048) return NextResponse.json({ error: 'Dữ liệu quá lớn.' }, { status: 413 });
    const input = JSON.parse(text);
    if (typeof input?.username !== 'string' || typeof input?.password !== 'string') return NextResponse.json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' }, { status: 400 });
    // Reading a body yields: another request may have consumed the last attempt.
    if (failures >= 5) return NextResponse.json({ error: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau một phút.' }, { status: 429, headers: { 'Retry-After': '60' } });
    failures++;
    if (!await verifyCredentials(input.username, input.password)) return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không đúng.' }, { status: 401 });
    const token = createSession();
    failures = 0;
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_MAX_AGE });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Dữ liệu không hợp lệ.' : 'Chưa thể đăng nhập. Vui lòng thử lại sau.' }, { status: error instanceof SyntaxError ? 400 : 500 });
  }
}
