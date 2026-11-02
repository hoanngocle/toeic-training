import type { Session } from '../learning/types.ts';
import type { ExerciseResult } from '../essential/types.ts';
import type { RewardCalculation } from './types.ts';

export const REWARD_VERSION = 'toeic-learning-v1';
export const BADGE_REWARD_VERSION = 'toeic-learning-badges-v2';
export function applyBadgeBonus(base: RewardCalculation, percent: number): RewardCalculation {
  if (!Number.isSafeInteger(percent * 2) || percent < 0) throw new RangeError('Invalid badge bonus');
  if (base.version !== REWARD_VERSION || !Number.isSafeInteger(base.exp) || base.exp < 0) throw new Error('Invalid base reward');
  // Use integer half-percent units and BigInt to avoid floating-point rounding.
  const bonusExp = Number(BigInt(base.exp) * BigInt(percent * 2) / BigInt(200));
  const exp = base.exp + bonusExp;
  if (!Number.isSafeInteger(exp)) throw new RangeError('Reward overflow');
  return {...base, version: BADGE_REWARD_VERSION, exp, baseExp: base.exp, badgeBonusPercent: percent, bonusExp};
}
function calculate(session: Session | ExerciseResult, vocabulary: boolean): RewardCalculation {
  if (!session || !Array.isArray(session.results) || !Number.isSafeInteger(session.total) || session.total < 1 ||
      session.results.length !== session.total || session.results.some(answer => !answer || typeof answer.correct !== 'boolean')) {
    throw new Error('Invalid graded result for EXP');
  }
  const flash = vocabulary && 'mode' in session && session.mode === 'flashcard';
  const correctCount = session.results.filter(answer => answer.correct).length;
  if (flash ? session.score !== null : session.score !== correctCount) throw new Error('Inconsistent graded score for EXP');
  let baseHundredths = 0;
  for (const answer of session.results) {
    if (vocabulary && (!('direction' in answer) || !['en-vi','vi-en'].includes(answer.direction))) throw new Error('Invalid reward direction');
    baseHundredths += vocabulary && 'direction' in answer && answer.direction === 'vi-en' ? 1840 : 1600;
  }
  if (vocabulary && !['flashcard','writing','test'].includes((session as Session).mode)) throw new Error('Invalid reward mode');
  const tenths = flash || correctCount === 0 ? 0 : correctCount === session.total ? 20 :
    correctCount * 10 >= session.total * 9 ? 15 : correctCount * 2 >= session.total ? 7 : 5;
  if (!Number.isSafeInteger(baseHundredths * tenths)) throw new RangeError('Reward overflow');
  return {exp:Math.floor(baseHundredths * tenths / 1000),version:REWARD_VERSION,questionCount:session.total,
    correctCount,baseTotal:baseHundredths / 100,scoreMultiplier:tenths / 10};
}
export function calculateVocabularyReward(session: Session): RewardCalculation { return calculate(session,true); }
export function calculateEssentialReward(session: ExerciseResult): RewardCalculation { return calculate(session,false); }
