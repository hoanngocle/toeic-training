import { unauthorizedResponse } from "../../../lib/auth-server";
import { join } from 'node:path';
import { getLesson } from '../../../components/vocabulary/catalog';
import { InputError, LearningStore } from '../../../lib/learning/store';
import { hasValidOrigin } from '../../../lib/request-origin';

function openStore() { return new LearningStore(process.env.LEARNING_DB_PATH || join(process.cwd(), 'data', 'learning.sqlite')); }
export async function GET(request: Request) {
  const unauthorized = await unauthorizedResponse();
  if (unauthorized) return unauthorized;
  const slug = new URL(request.url).searchParams.get('lesson') ?? '';
  if (!getLesson(slug)) return Response.json({error:'Không tìm thấy bài học.'}, {status:404});
  let store: LearningStore | undefined;
  try {
    store = openStore();
    return Response.json(store.read(slug), {headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'Chưa đọc được tiến độ. Vui lòng thử lại.'}, {status:500}); }
  finally { store?.close(); }
}
export async function POST(request: Request) {
  const unauthorized = await unauthorizedResponse();
  if (unauthorized) return unauthorized;
  if (!hasValidOrigin(request)) return Response.json({error:'Nguồn yêu cầu không hợp lệ.'}, {status:403});
  let store: LearningStore | undefined;
  try {
    const text = await request.text();
    if (text.length > 64000) return Response.json({error:'Dữ liệu quá lớn.'}, {status:413});
    const input = JSON.parse(text);
    const lesson = getLesson(typeof input?.lesson === 'string' ? input.lesson : '');
    if (!lesson) return Response.json({error:'Không tìm thấy bài học.'}, {status:404});
    store = openStore();
    return Response.json(store.save(input, lesson.words));
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return Response.json({error:error instanceof InputError ? error.message : 'Dữ liệu JSON không hợp lệ.'}, {status:400});
    return Response.json({error:'Chưa lưu được kết quả. Giữ trang này và thử lưu lại.'}, {status:500});
  } finally { store?.close(); }
}
