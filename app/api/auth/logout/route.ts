import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../../../lib/auth';
import { hasValidOrigin } from '../../../../lib/request-origin';

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
  const response = new NextResponse(null, { status: 303, headers: { Location: '/login', 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return response;
}
