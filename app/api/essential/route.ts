import { requireApiUser } from '../../../lib/auth-server';
import { getBookUnit } from '../../../lib/essential/catalog';
import { ExerciseInputError } from '../../../lib/essential/grading';
import { hasValidOrigin } from '../../../lib/request-origin';
import { userClient } from '../../../lib/supabase/server';
import { adminClient } from '../../../lib/supabase/admin';
import { readExercises,saveExercise } from '../../../lib/supabase/learning';
import { readInput,accountFailure } from '../../../lib/accounts/http';
import { AccountError } from '../../../lib/accounts/policy';
export async function GET(request:Request) {
  try {
    const user=await requireApiUser();if(!user) throw new AccountError('Vui lòng đăng nhập.',401);
    const id=new URL(request.url).searchParams.get('unit')??'';
    if(!getBookUnit(id)) throw new AccountError('Không tìm thấy phần bài tập.',404);
    return Response.json({sessions:await readExercises(await userClient(),user.id,id)},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return accountFailure(error);}
}
export async function POST(request:Request) {
  try {
    const user=await requireApiUser();if(!user) throw new AccountError('Vui lòng đăng nhập.',401);
    if(!hasValidOrigin(request)) throw new AccountError('Nguồn yêu cầu không hợp lệ.',403);
    const input=await readInput(request,64000);
    const id=input && typeof input==='object' && 'unitId' in input && typeof input.unitId==='string'?input.unitId:'';
    const unit=getBookUnit(id);if(!unit) throw new AccountError('Không tìm thấy phần bài tập.',404);
    return Response.json(await saveExercise(await userClient(),adminClient(),user.id,input,unit),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return accountFailure(error instanceof ExerciseInputError?new AccountError(error.message):error);}
}
