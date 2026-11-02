import type { SupabaseClient } from '@supabase/supabase-js';
import type { EtsRequest, EtsResult, EtsTest } from './types.ts';
import { gradeEts } from './grading.ts';
import { AccountError } from '../accounts/policy.ts';

function check(error: { message: string } | null) {
  if (!error) return;
  if (error.message.includes('REQUEST_CONFLICT')) throw new AccountError('Mã lượt làm đã được sử dụng cho dữ liệu khác.', 409);
  if (error.message.includes('ACCOUNT_DISABLED')) throw new AccountError('Tài khoản không khả dụng.', 401);
  throw new Error('ETS database request failed. Check migration and permissions.');
}
export async function readEtsResults(client: SupabaseClient, userId: string, testId: number, part: number): Promise<EtsResult[]> {
  const response = await client.from('ets_sessions').select('result').eq('user_id', userId).eq('test_id', testId).eq('part', part).order('created_at', { ascending: false }).order('id').limit(50);
  check(response.error);
  return (response.data ?? []).map(row => row.result as EtsResult);
}
export async function saveEtsResult(writer: SupabaseClient, userId: string, input: unknown, test: EtsTest): Promise<EtsResult> {
  const result = gradeEts(input, test);
  const value = input as EtsRequest;
  const request: EtsRequest = { id: value.id, testId: value.testId, part: value.part, durationMs: value.durationMs, answers: value.answers };
  const response = await writer.rpc('save_ets', { p_user_id: userId, p_request: request, p_result: result });
  check(response.error);
  return response.data as EtsResult;
}
