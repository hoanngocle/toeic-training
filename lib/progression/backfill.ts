import { isDeepStrictEqual } from 'node:util';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Session } from '../learning/types.ts';
import type { ExerciseResult } from '../essential/types.ts';
import { applyBadgeBonus, BADGE_REWARD_VERSION, calculateVocabularyReward, calculateEssentialReward } from './reward.ts';
import type { RewardCalculation } from './types.ts';

export type BackfillRow = {id:string;created_at:string;result:Session | ExerciseResult};
type LedgerRow = {source_type:string;source_id:string;amount:number|string;reward_version:string;calculation:RewardCalculation;created_at:string};
export type BackfillEntry = {sourceType:'vocabulary'|'essential';sourceId:string;createdAt:string;result:Session|ExerciseResult;calculation:RewardCalculation};
function validateHistoryResult(row:BackfillRow, sourceType:'vocabulary'|'essential') {
  const result=row.result;
  if (!result || !/^[\w-]{10,80}$/.test(row.id) || !Number.isInteger(result.durationMs) || result.durationMs<0 || result.durationMs>86400000 || !Array.isArray(result.results)) throw new Error('Invalid historical result schema');
  const identifiers=new Set<string|number>();
  if (sourceType==='vocabulary') {
    const session=result as Session;
    if (typeof session.lesson!=='string' || !session.lesson || !['flashcard','writing','test'].includes(session.mode) ||
      (session.mode!=='test' && session.results.length!==1)) throw new Error('Invalid vocabulary result schema');
    for (const answer of session.results) {
      if (!answer || !Number.isSafeInteger(answer.wordId) || answer.wordId<1 || identifiers.has(answer.wordId) ||
        !['term','meaning','expected','answer'].every(key=>typeof answer[key as keyof typeof answer]==='string')) throw new Error('Invalid or duplicate vocabulary answer');
      identifiers.add(answer.wordId);
    }
  } else {
    const exercise=result as ExerciseResult;
    if (typeof exercise.unitId!=='string' || !exercise.unitId) throw new Error('Invalid exercise result schema');
    for (const answer of exercise.results) {
      if (!answer || typeof answer.questionId!=='string' || !answer.questionId || identifiers.has(answer.questionId) ||
        !['label','answer','expected'].every(key=>typeof answer[key as keyof typeof answer]==='string')) throw new Error('Invalid or duplicate exercise answer');
      identifiers.add(answer.questionId);
    }
  }
}
export function prepareBackfill(vocabulary:BackfillRow[],essential:BackfillRow[],ledger:LedgerRow[]) {
  const entries:BackfillEntry[]=[];
  const existingById=new Map(ledger.map(row=>[`${row.source_type}:${row.source_id}`,row]));
  let existing=0,expAdded=0;
  for (const [sourceType,rows] of [['vocabulary',vocabulary],['essential',essential]] as const) {
    for (const row of rows) {
      try {
        if (!row.id || row.id !== row.result?.id || !Number.isFinite(Date.parse(row.created_at)) ||
            Date.parse(row.created_at)!==Date.parse(row.result.createdAt)) throw new Error('Invalid source identity or timestamp');
        validateHistoryResult(row,sourceType);
        let calculation=sourceType==='vocabulary'?calculateVocabularyReward(row.result as Session):calculateEssentialReward(row.result as ExerciseResult);
        const prior=existingById.get(`${sourceType}:${row.id}`);
        if (prior?.reward_version===BADGE_REWARD_VERSION) calculation=applyBadgeBonus(calculation,prior.calculation.badgeBonusPercent!);
        if (prior) {
          if (Number(prior.amount)!==calculation.exp || prior.reward_version!==calculation.version ||
            !isDeepStrictEqual(prior.calculation,calculation) || Date.parse(prior.created_at)!==Date.parse(row.created_at)) throw new Error('Reward conflict');
          existing++;
        } else expAdded+=calculation.exp;
        if (!Number.isSafeInteger(expAdded)) throw new Error('EXP overflow');
        entries.push({sourceType,sourceId:row.id,createdAt:row.created_at,result:row.result,calculation});
      } catch(error) { throw new Error(`${sourceType}:${row.id}: ${error instanceof Error?error.message:'Invalid history'}`); }
    }
  }
  return {scanned:entries.length,inserted:entries.length-existing,existing,expAdded,entries};
}
export async function backfillCloudProgression(client:SupabaseClient,userId:string,{dryRun}:{dryRun:boolean}) {
  const groups:unknown[][]=[];
  for (const table of ['sessions','essential_sessions','learning_exp_ledger']) {
    const rows:unknown[]=[];
    for(let offset=0;;offset+=1000) {
      let query=client.from(table).select(table==='learning_exp_ledger'?'*':'id,result,created_at').eq('user_id',userId);
      query=table==='learning_exp_ledger'?query.order('source_type').order('source_id'):query.order('sequence');
      const {data,error}=await query.range(offset,offset+999);
      if(error) throw new Error(`Could not read ${table}; check migration and connection`);
      rows.push(...data??[]);
      if((data??[]).length<1000)break;
    }
    groups.push(rows);
  }
  const {entries,...stats}=prepareBackfill(groups[0] as BackfillRow[],groups[1] as BackfillRow[],groups[2] as LedgerRow[]);
  if (!dryRun) {
    const {error}=await client.rpc('backfill_learning_exp',{p_user_id:userId,p_entries:entries});
    if(error) throw new Error('Backfill rolled back. History changed, reward conflict, inactive account, or invalid data; rerun dry-run and inspect before retrying.');
  }
  return stats;
}
