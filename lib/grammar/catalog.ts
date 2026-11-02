import 'server-only';
import source from '../../data/grammar/book.json';
import type { GrammarCategory } from './types';

export const grammarCategories = source as GrammarCategory[];
export const grammarUnits = grammarCategories.flatMap(category => category.lessons.flatMap(lesson => lesson.exercises));
export function getGrammarCategory(slug: string) {
  return grammarCategories.find(category => category.slug === slug);
}
export function getGrammarLesson(categorySlug: string, lessonSlug: string) {
  return getGrammarCategory(categorySlug)?.lessons.find(lesson => lesson.slug === `${categorySlug}-${lessonSlug}`);
}
export function grammarLessonHref(categorySlug: string, lesson: { slug: string }) {
  return `/ngu-phap/${categorySlug}/${lesson.slug.slice(categorySlug.length + 1)}`;
}
