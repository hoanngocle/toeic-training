import { AccountError } from './policy';
export async function readInput(request:Request,max=4096) {
  const text=await request.text();
  if (text.length>max) throw new AccountError('Dữ liệu quá lớn.',413);
  try { return JSON.parse(text) as unknown; } catch { throw new AccountError('Dữ liệu JSON không hợp lệ.'); }
}
export function accountFailure(error:unknown) {
  if (error instanceof AccountError) return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});
  // Do not log provider objects, credentials, tokens, or request bodies.
  console.error('Account request failed. Check Supabase configuration and migrations.');
  return Response.json({error:'Chưa thể thực hiện. Vui lòng kiểm tra cấu hình hoặc thử lại sau.'},{status:503,headers:{'Cache-Control':'no-store'}});
}
