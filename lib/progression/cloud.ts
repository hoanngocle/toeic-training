import type { SupabaseClient } from '@supabase/supabase-js';
import { getProgression } from './summary.ts';
import type { ProgressionResult, ProgressionSummary } from './types.ts';

export function progressionResult<T extends object>(value: T & {progressionTotals?: {before:number;after:number}}): Omit<T,'progressionTotals'> & ProgressionResult {
  const {progressionTotals,...result} = value;
  return {...result,...(progressionTotals ? {progressionChange:{before:getProgression(progressionTotals.before),after:getProgression(progressionTotals.after)}} : {})};
}
export async function readCloudProgression(client: SupabaseClient, userId: string): Promise<ProgressionSummary | null> {
  const {data,error} = await client.rpc('read_progression',{p_user_id:userId});
  if (error) throw new Error('Could not read learning progression. Check progression migration.');
  if (!data || typeof data.pending !== 'boolean') throw new Error('Invalid progression response');
  return data.pending ? null : getProgression(Number(data.totalExp));
}
