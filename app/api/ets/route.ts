import { requireApiUser } from '../../../lib/auth-server';
import { getEtsTest } from '../../../lib/ets/catalog';
import { EtsInputError, validateEtsScope } from '../../../lib/ets/grading';
import { readEtsResults, saveEtsResult } from '../../../lib/ets/storage';
import { hasValidOrigin } from '../../../lib/request-origin';
import { userClient } from '../../../lib/supabase/server';
import { adminClient } from '../../../lib/supabase/admin';
import { readInput, accountFailure } from '../../../lib/accounts/http';
import { AccountError } from '../../../lib/accounts/policy';

function failure(error: unknown) { return accountFailure(error instanceof EtsInputError ? new AccountError(error.message, 400) : error); }
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) throw new AccountError('Vui lòng đăng nhập.', 401);
    const params = new URL(request.url).searchParams;
    const testId = Number(params.get('test'));
    const part = Number(params.get('part') ?? '0');
    const test = Number.isInteger(testId) ? getEtsTest(testId) : undefined;
    if (!test) throw new AccountError('Không tìm thấy đề.', 404);
    validateEtsScope(test, part);
    return Response.json({ sessions: await readEtsResults(await userClient(), user.id, testId, part) }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) throw new AccountError('Vui lòng đăng nhập.', 401);
    if (!hasValidOrigin(request)) throw new AccountError('Nguồn yêu cầu không hợp lệ.', 403);
    const input = await readInput(request, 32000);
    const id = input && typeof input === 'object' && 'testId' in input && typeof input.testId === 'number' ? input.testId : NaN;
    const test = getEtsTest(id);
    if (!test) throw new AccountError('Không tìm thấy đề.', 404);
    return Response.json(await saveEtsResult(adminClient(), user.id, input, test), { headers });
  } catch (error) { return failure(error); }
}
