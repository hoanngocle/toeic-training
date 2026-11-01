import { requireApiUser } from '../../../../lib/auth-server';
import { adminClient,accountBackend } from '../../../../lib/supabase/admin';
import { hasValidOrigin } from '../../../../lib/request-origin';
import { readInput,accountFailure } from '../../../../lib/accounts/http';
import { createAccount } from '../../../../lib/accounts/service';
import { AccountError } from '../../../../lib/accounts/policy';
export async function GET(request:Request) {
  try {
    await requireApiUser(true);
    const page=Number(new URL(request.url).searchParams.get('page')??1);
    if(!Number.isInteger(page)||page<1||page>100000) throw new AccountError('Trang không hợp lệ.');
    const {data,error,count}=await adminClient().from('profiles').select('id,email,role,disabled,created_at',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*20,page*20-1);
    if(error) throw error;
    return Response.json({users:data??[],total:count??0,page},{headers:{'Cache-Control':'no-store'}});
  } catch(error){return accountFailure(error);}
}
export async function POST(request:Request) {
  try {
    const actor=await requireApiUser(true);
    if(!hasValidOrigin(request)) throw new AccountError('Nguồn yêu cầu không hợp lệ.',403);
    await createAccount(actor,await readInput(request),accountBackend());
    return Response.json({ok:true},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch(error){return accountFailure(error);}
}
