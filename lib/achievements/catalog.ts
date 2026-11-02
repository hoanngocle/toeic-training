import { getLesson } from '../../components/vocabulary/catalog';
import { normalizeAnswer } from '../learning/practice';

export function lessonTestSize(slug: string): number {
  return Math.min(20, new Set(getLesson(slug)?.words.map(word => normalizeAnswer(word.spokenText)) ?? []).size);
}
