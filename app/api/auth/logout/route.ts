import { hasValidOrigin } from '../../../../lib/request-origin';
import { userClient } from '../../../../lib/supabase/server';
import { accountFailure } from '../../../../lib/accounts/http';
export async function POST(request:Request) {
  if (!hasValidOrigin(request)) return Response.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});
  try {
    const client=await userClient();
    const {error}=await client.auth.signOut({scope:'local'});
    if (error) throw error;
    return new Response(null,{status:303,headers:{Location:'/login','Cache-Control':'no-store'}});
  } catch(error) {return accountFailure(error);}
}
