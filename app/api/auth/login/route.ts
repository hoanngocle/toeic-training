import { hasValidOrigin } from '../../../../lib/request-origin';
import { userClient } from '../../../../lib/supabase/server';
import { credentials, activeUser, AccountError } from '../../../../lib/accounts/policy';
import { readInput, accountFailure } from '../../../../lib/accounts/http';
import { hasSupabaseConfig } from '../../../../lib/supabase/config';
export async function POST(request:Request) {
  if (!hasValidOrigin(request)) return Response.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});
  try {
    if (!hasSupabaseConfig()) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      throw new AccountError('Đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên.',503);
    }
    const input=credentials(await readInput(request));
    const client=await userClient();
    const {data,error}=await client.auth.signInWithPassword(input);
    if (error || !data.user) throw new AccountError(error?.status===429?'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.':'Email hoặc mật khẩu không đúng, hoặc tài khoản không khả dụng.',error?.status===429?429:401);
    const {data:profile,error:profileError}=await client.from('profiles').select('id,role,disabled').eq('id',data.user.id).maybeSingle();
    if (profileError || !activeUser(data.user,profile)) {
      await client.auth.signOut({scope:'local'});
      throw new AccountError(profileError?'Chưa đọc được tài khoản. Vui lòng liên hệ quản trị viên.':'Email hoặc mật khẩu không đúng, hoặc tài khoản không khả dụng.',profileError?503:401);
    }
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return accountFailure(error);}
}
