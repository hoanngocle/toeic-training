import { requireApiUser } from '../../../lib/auth-server';
import { getLesson } from '../../../components/vocabulary/catalog';
import { lessonTestSize } from '../../../lib/achievements/catalog';
import { InputError } from '../../../lib/learning/grading';
import { withWordFamilies } from '../../../lib/learning/practice';
import { hasValidOrigin } from '../../../lib/request-origin';
import { userClient } from '../../../lib/supabase/server';
import { adminClient } from '../../../lib/supabase/admin';
import { readLearning,readLearningProgress,readLearningHistory,saveLearning } from '../../../lib/supabase/learning';
import { readInput,accountFailure } from '../../../lib/accounts/http';
import { AccountError } from '../../../lib/accounts/policy';
export async function GET(request:Request) {
  try {
    const user=await requireApiUser();if(!user) throw new AccountError('Vui lòng đăng nhập.',401);
    const params=new URL(request.url).searchParams;
    const slug=params.get('lesson')??'';
    if(!getLesson(slug)) throw new AccountError('Không tìm thấy bài học.',404);
    const view=params.get('view');
    if(view!==null && view!=='progress' && view!=='history') throw new AccountError('Kiểu dữ liệu không hợp lệ.',400);
    const client=await userClient();
    const data=view==='progress'?await readLearningProgress(client,user.id,slug)
      :view==='history'?{sessions:await readLearningHistory(client,user.id,slug)}
      :await readLearning(client,user.id,slug);
    return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return accountFailure(error);}
}
export async function POST(request:Request) {
  try {
    const user=await requireApiUser();if(!user) throw new AccountError('Vui lòng đăng nhập.',401);
    if(!hasValidOrigin(request)) throw new AccountError('Nguồn yêu cầu không hợp lệ.',403);
    const input=await readInput(request,64000);
    const slug=input && typeof input==='object' && 'lesson' in input && typeof input.lesson==='string'?input.lesson:'';
    const lesson=getLesson(slug);if(!lesson) throw new AccountError('Không tìm thấy bài học.',404);
    return Response.json(await saveLearning(adminClient(),user.id,input,withWordFamilies(lesson.words,lesson.wordFamilies),lessonTestSize),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return accountFailure(error instanceof InputError?new AccountError(error.message):error);}
}
