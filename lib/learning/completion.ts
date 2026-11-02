import type { Progress } from './types.ts';

export function lessonAnswerProgress(words: readonly { id: number }[], progress: readonly Pick<Progress, 'wordId' | 'correct'>[]) {
  const correctIds = new Set(progress.filter(word => word.correct > 0).map(word => word.wordId));
  const answeredCorrectly = words.filter(word => correctIds.has(word.id)).length;
  return { answeredCorrectly, percent: words.length ? Math.floor(answeredCorrectly / words.length * 100) : 0 };
}

export function lessonCompletion(words: readonly { id: number }[], progress: readonly Pick<Progress, 'wordId' | 'status'>[]) {
  const learnedIds = new Set(progress.filter(word => word.status === 'learned').map(word => word.wordId));
  const learned = words.filter(word => learnedIds.has(word.id)).length;
  return {
    learned,
    percent: words.length ? Math.floor(learned / words.length * 100) : 0,
    completed: words.length > 0 && learned * 100 >= words.length * 80,
  };
}
