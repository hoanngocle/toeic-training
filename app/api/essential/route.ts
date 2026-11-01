import { unauthorizedResponse } from "../../../lib/auth-server";
import { join } from 'node:path';
import { getBookUnit } from '../../../lib/essential/catalog';
import { ExerciseInputError, ExerciseStore } from '../../../lib/essential/store';
import { hasValidOrigin } from '../../../lib/request-origin';

function openStore(){return new ExerciseStore(process.env.LEARNING_DB_PATH || join(process.cwd(),'data','learning.sqlite'));}
export async function GET(request: Request){
  const unauthorized = await unauthorizedResponse();
  if (unauthorized) return unauthorized;
  const id=new URL(request.url).searchParams.get('unit')??'';
  if(!getBookUnit(id)) return Response.json({error:'Không tìm thấy phần bài tập.'},{status:404});
  let store:ExerciseStore|undefined;
  try {store=openStore();return Response.json({sessions:store.read(id)},{headers:{'Cache-Control':'no-store'}});}
  catch {return Response.json({error:'Chưa đọc được lịch sử. Hãy thử lại.'},{status:500});}
  finally {store?.close();}
}
export async function POST(request: Request){
  const unauthorized = await unauthorizedResponse();
  if (unauthorized) return unauthorized;
  if(!hasValidOrigin(request)) return Response.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});
  let store:ExerciseStore|undefined;
  try {
    const text=await request.text();
    if(text.length>64000) return Response.json({error:'Dữ liệu quá lớn.'},{status:413});
    const input=JSON.parse(text);
    const unit=getBookUnit(typeof input?.unitId==='string'?input.unitId:'');
    if(!unit) return Response.json({error:'Không tìm thấy phần bài tập.'},{status:404});
    store=openStore();return Response.json(store.save(input,unit));
  } catch(error){
    if(error instanceof ExerciseInputError||error instanceof SyntaxError) return Response.json({error:error instanceof ExerciseInputError?error.message:'JSON không hợp lệ.'},{status:400});
    return Response.json({error:'Chưa lưu được bài. Giữ trang và thử lưu lại.'},{status:500});
  } finally {store?.close();}
}
