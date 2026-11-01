import type { Session } from '../learning/types.ts';
import type { ExerciseResult } from '../essential/types.ts';
import type { RewardCalculation } from './types.ts';

export const REWARD_VERSION = 'toeic-learning-v1';
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
