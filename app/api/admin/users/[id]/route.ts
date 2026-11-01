import { requireApiUser } from '../../../../../lib/auth-server';
import { accountBackend } from '../../../../../lib/supabase/admin';
import { hasValidOrigin } from '../../../../../lib/request-origin';
import { readInput,accountFailure } from '../../../../../lib/accounts/http';
import { updateAccount } from '../../../../../lib/accounts/service';
import { AccountError } from '../../../../../lib/accounts/policy';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const actor=await requireApiUser(true);
    if(!hasValidOrigin(request)) throw new AccountError('Nguồn yêu cầu không hợp lệ.',403);
    const {id}=await params;
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new AccountError('Tài khoản không hợp lệ.');
    await updateAccount(actor,id,await readInput(request),accountBackend());
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch(error){return accountFailure(error);}
}
