import { requireApiUser } from '../../../lib/auth-server';
import { getLesson } from '../../../components/vocabulary/catalog';
import { InputError } from '../../../lib/learning/grading';
import { hasValidOrigin } from '../../../lib/request-origin';
import { userClient } from '../../../lib/supabase/server';
import { adminClient } from '../../../lib/supabase/admin';
import { readLearning,saveLearning } from '../../../lib/supabase/learning';
import { readInput,accountFailure } from '../../../lib/accounts/http';
import { AccountError } from '../../../lib/accounts/policy';
export async function GET(request:Request) {
  try {
    const user=await requireApiUser();if(!user) throw new AccountError('Vui lòng đăng nhập.',401);
    const slug=new URL(request.url).searchParams.get('lesson')??'';
    if(!getLesson(slug)) throw new AccountError('Không tìm thấy bài học.',404);
    return Response.json(await readLearning(await userClient(),user.id,slug),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return accountFailure(error);}
}
export async function POST(request:Request) {
  try {
    const user=await requireApiUser();if(!user) throw new AccountError('Vui lòng đăng nhập.',401);
    if(!hasValidOrigin(request)) throw new AccountError('Nguồn yêu cầu không hợp lệ.',403);
    const input=await readInput(request,64000);
    const slug=input && typeof input==='object' && 'lesson' in input && typeof input.lesson==='string'?input.lesson:'';
    const lesson=getLesson(slug);if(!lesson) throw new AccountError('Không tìm thấy bài học.',404);
    return Response.json(await saveLearning(adminClient(),user.id,input,lesson.words),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return accountFailure(error instanceof InputError?new AccountError(error.message):error);}
}
