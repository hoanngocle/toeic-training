import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { safeReturnPath } from './lib/auth';
import { hasSupabaseConfig, supabaseConfig } from './lib/supabase/config';

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-app-return-path',safeReturnPath(request.nextUrl.pathname+request.nextUrl.search));
  let response=NextResponse.next({request:{headers:requestHeaders}});
  response.headers.set('Cache-Control','private, no-store');
  if (!hasSupabaseConfig()) return response;
  const {url,key}=supabaseConfig();
  const client=createServerClient(url,key,{
    cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},
    cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll(values) {
        for (const {name,value} of values) request.cookies.set(name,value);
        requestHeaders.set('cookie',request.cookies.toString());
        response=NextResponse.next({request:{headers:requestHeaders}});
        for (const {name,value,options} of values) response.cookies.set(name,value,options);
        response.headers.set('Cache-Control','private, no-store');
      },
    },
  });
  // Refresh only; every protected page/API verifies identity and the current profile.
  await client.auth.getClaims();
  return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|fonts/).*)']};
