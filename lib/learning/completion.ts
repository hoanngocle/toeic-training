import type { Progress } from './types.ts';

export function lessonCompletion(words: readonly { id: number }[], progress: readonly Pick<Progress, 'wordId' | 'status'>[]) {
  const learnedIds = new Set(progress.filter(word => word.status === 'learned').map(word => word.wordId));
  const learned = words.filter(word => learnedIds.has(word.id)).length;
  return {
    learned,
    percent: words.length ? Math.floor(learned / words.length * 100) : 0,
    completed: words.length > 0 && learned * 100 >= words.length * 80,
  };
}
