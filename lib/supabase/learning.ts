import { applyBadgeBonus, calculateVocabularyReward, calculateEssentialReward } from '../progression/reward.ts';
import { collectionBonusPercent } from '../achievements/bonus.ts';
import { progressionResult } from '../progression/cloud.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { gradeLearning } from '../learning/grading.ts';
import type { Word } from '../learning/practice.ts';
import type { LearningState, Progress, Session, SessionSummary } from '../learning/types.ts';
import { gradeExercise, ExerciseInputError } from '../essential/grading.ts';
import type { BookUnit, ExerciseRequest, ExerciseResult } from '../essential/types.ts';
import { activityDay, summarizeActivity } from '../achievements/summary.ts';
import { collectionFromHistory } from './achievement-data.ts';
import type { HistoryRow } from './achievement-data.ts';
import { AccountError } from '../accounts/policy.ts';

function check(error:{message:string}|null) {
  if (!error) return;
  if (error.message.includes('PROGRESSION_BACKFILL_REQUIRED')) throw new AccountError('Tiến độ EXP đang được đồng bộ. Vui lòng thử lại sau.',503);
  if (error.message.includes('REQUEST_CONFLICT')) throw new AccountError('Mã lượt học đã được sử dụng cho dữ liệu khác.',409);
  if (error.message.includes('ACCOUNT_DISABLED')) throw new AccountError('Tài khoản không khả dụng. Vui lòng đăng nhập lại.',401);
  if (error.message.includes('RETRY_NOT_FOUND')) throw new AccountError('Không tìm thấy lượt làm bài để ôn lại.',400);
  throw new Error('Learning database request failed. Check migrations and permissions.');
}
export async function readLearning(client:SupabaseClient,userId:string,lesson:string):Promise<LearningState> {
  const [progress,sessions]=await Promise.all([
    client.from('progress').select('wordId:word_id,reviews,correct,incorrect,streak,status,lastReviewedAt:last_reviewed_at').eq('user_id',userId).eq('lesson',lesson).order('word_id'),
    client.from('sessions').select('result',{count:'exact'}).eq('user_id',userId).eq('lesson',lesson).neq('mode','flashcard').order('created_at',{ascending:false}).order('id').limit(50),
  ]);
  check(progress.error);check(sessions.error);
  return {progress:(progress.data??[]) as Progress[],sessions:(sessions.data??[]).map(row=>row.result as Session),totalSessions:sessions.count??0};
}
export async function readLearningProgress(client:SupabaseClient,userId:string,lesson:string):Promise<LearningState> {
  const [progress,sessions]=await Promise.all([
    client.from('progress').select('wordId:word_id,reviews,correct,incorrect,streak,status,lastReviewedAt:last_reviewed_at').eq('user_id',userId).eq('lesson',lesson).order('word_id'),
    client.from('sessions').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('lesson',lesson).neq('mode','flashcard'),
  ]);
  check(progress.error);check(sessions.error);
  return {progress:(progress.data??[]) as Progress[],sessions:[],totalSessions:sessions.count??0};
}
export async function readLearningHistory(client:SupabaseClient,userId:string,lesson:string):Promise<SessionSummary[]> {
  const response=await client.from('sessions')
    .select('id,mode,createdAt:created_at,durationMs:result->durationMs,score:result->score,total:result->total,includeWordFamilies:result->includeWordFamilies')
    .eq('user_id',userId).eq('lesson',lesson).neq('mode','flashcard')
    .order('created_at',{ascending:false}).order('id').limit(50);
  check(response.error);
  return (response.data??[]) as unknown as SessionSummary[];
}
export async function readLearnedWords(client:SupabaseClient,userId:string) {
  const byLesson: Record<string, Pick<Progress,'wordId'|'status'>[]> = {};
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await client.from('progress').select('lesson,wordId:word_id')
      .eq('user_id',userId).eq('status','learned')
      .order('lesson').order('word_id').range(offset,offset + pageSize - 1);
    check(response.error);
    const rows = response.data ?? [];
    for (const row of rows) (byLesson[row.lesson] ??= []).push({wordId:row.wordId,status:'learned'});
    if (rows.length < pageSize) return byLesson;
  }
}
export async function saveLearning(writer:SupabaseClient,userId:string,input:unknown,words:Word[],testSize:(lesson:string)=>number):Promise<Session> {
  const {request,result}=gradeLearning(input,words);
  const achievements=await readCloudAchievements(writer,userId,new Date(),testSize);
  const rewardCalculation=applyBadgeBonus(calculateVocabularyReward(result),collectionBonusPercent(achievements.collection.awards));
  const response=await writer.rpc('save_learning',{p_user_id:userId,p_request:request,p_result:{...result,rewardCalculation}});
  check(response.error);return progressionResult(response.data as Session & {progressionTotals?: {before:number;after:number}});
}
export async function readExercises(client:SupabaseClient,userId:string,unit:string):Promise<ExerciseResult[]> {
  const response=await client.from('essential_sessions').select('result').eq('user_id',userId).eq('unit',unit).order('created_at',{ascending:false}).order('id').limit(50);
  check(response.error);return (response.data??[]).map(row=>row.result as ExerciseResult);
}
export async function saveExercise(client:SupabaseClient,writer:SupabaseClient,userId:string,input:unknown,unit:BookUnit,testSize:(lesson:string)=>number):Promise<ExerciseResult> {
  let scope:string[]|undefined;
  if (input && typeof input==='object' && 'retryOf' in input && input.retryOf!==undefined) {
    if (typeof input.retryOf!=='string' || !/^[\w-]{10,80}$/.test(input.retryOf)) throw new ExerciseInputError('Lượt ôn lại không hợp lệ.');
    const previous=await client.from('essential_sessions').select('result').eq('user_id',userId).eq('unit',unit.id).eq('id',input.retryOf).maybeSingle();
    check(previous.error);
    if (!previous.data) throw new ExerciseInputError('Không tìm thấy lượt làm bài để ôn lại.');
    scope=(previous.data.result as ExerciseResult).results.filter(answer=>!answer.correct).map(answer=>answer.questionId);
  }
  const result=gradeExercise(input,unit,scope);
  const value=input as ExerciseRequest;
  const request={id:value.id,unitId:value.unitId,durationMs:value.durationMs,...(value.retryOf?{retryOf:value.retryOf}:{}),answers:value.answers};
  const achievements=await readCloudAchievements(writer,userId,new Date(),testSize);
  const rewardCalculation=applyBadgeBonus(calculateEssentialReward(result),collectionBonusPercent(achievements.collection.awards));
  const response=await writer.rpc('save_exercise',{p_user_id:userId,p_request:request,p_result:{...result,rewardCalculation}});
  check(response.error);return progressionResult(response.data as ExerciseResult & {progressionTotals?: {before:number;after:number}});
}
export async function readCloudAchievements(client:SupabaseClient,userId:string,now=new Date(),testSize:(lesson:string)=>number=()=>20) {
  // Explicit pagination avoids Supabase's default row limit truncating long streaks.
  const days:string[]=[];
  for (let offset=0;;offset+=1000) {
    const response=await client.from('activity_days').select('day').eq('user_id',userId).order('day').range(offset,offset+999);
    check(response.error);
    const batch=(response.data??[]).map(row=>String(row.day));days.push(...batch);
    if (batch.length<1000) break;
  }
  const histories:HistoryRow[][]=[];
  for (const table of ['sessions','essential_sessions']) {
    const rows:HistoryRow[]=[];
    for (let offset=0;;offset+=1000) {
      const response=await client.from(table).select('*').eq('user_id',userId).order('created_at').order('sequence').range(offset,offset+999);
      check(response.error);
      const batch=(response.data??[]) as HistoryRow[];rows.push(...batch);
      if(batch.length<1000) break;
    }
    histories.push(rows);
  }
  const collection=collectionFromHistory(histories[0],histories[1],days,testSize);
  const previous=await client.from('achievement_awards').select('id,earned_day').eq('user_id',userId);
  check(previous.error);
  for (const row of previous.data??[]) {
    const old=collection.awards[row.id];
    collection.awards[row.id]=old&&old<row.earned_day?old:row.earned_day;
  }
  const today=activityDay(now);
  return {...summarizeActivity(days,today),days,today,totalSessions:histories[0].length+histories[1].length,collection};
}
