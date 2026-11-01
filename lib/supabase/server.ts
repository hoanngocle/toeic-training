import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig } from './config';
export async function userClient() {
  const store=await cookies();
  const {url,key}=supabaseConfig();
  return createServerClient(url,key,{
    cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},
    cookies:{
      getAll:()=>store.getAll(),
      setAll(values) {
        // Server Components cannot write cookies; proxy has already refreshed them.
        try { for (const {name,value,options} of values) store.set(name,value,options); } catch {}
      },
    },
  });
}
