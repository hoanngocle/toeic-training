import sourceLessons from "../../data/vocabulary/lessons.json";
import sourceExamples from "../../data/vocabulary/examples.json";
import { essentialLessons } from "../../lib/essential/catalog";
import type { BookPage } from "../../lib/essential/types";

type Example = { english: string; vietnamese: string };
const examples: Record<string, Record<string, Example>> = sourceExamples;
const originalLessons = sourceLessons.map(lesson => ({
  ...lesson,
  words: lesson.words.map(word => ({
    ...word,
    example: examples[lesson.slug]?.[String(word.id)] as Example | undefined,
  })),
}));

export type Lesson = Omit<(typeof originalLessons)[number], "words"> & {
  source?: "essential";
  group?: number;
  groupTitle?: string;
  vocabularyPages?: BookPage[];
  words: (Omit<(typeof originalLessons)[number]["words"][number], "example"> & { example?: Example; definition?: string })[];
};
// Only vocabulary fields cross into the client. Exercise answers remain on the server.
const lessons: Lesson[] = [...originalLessons, ...essentialLessons.map(lesson => ({
  slug: lesson.slug,
  number: lesson.number,
  title: lesson.title,
  sourceTitle: lesson.sourceTitle,
  source: lesson.source,
  group: lesson.group,
  groupTitle: lesson.groupTitle,
  vocabularyPages: lesson.vocabularyPages,
  words: lesson.words,
}))];
export type LessonSummary = Pick<Lesson, "slug" | "number" | "title" | "source" | "group" | "groupTitle"> & {
  sourceLabel: string;
  count: number;
  preview: string[];
  searchText: string;
};
export const lessonSummaries: LessonSummary[] = lessons.map(lesson => ({
  slug: lesson.slug,
  number: lesson.number,
  title: lesson.title,
  source: lesson.source,
  group: lesson.group,
  groupTitle: lesson.groupTitle,
  sourceLabel: lesson.source === "essential" ? "Essential Word" : lesson.sourceTitle.match(/BTVN \d+/)?.[0] ?? "",
  count: lesson.words.length,
  preview: lesson.words.slice(0, 3).map(word => word.spokenText),
  searchText: lesson.words.map(word => `${word.term} ${word.meaning}`).join(" "),
}));
export function getLesson(slug: string) {
  return lessons.find(lesson => lesson.slug === slug);
}

export const vocabularyStats = { lessons: lessons.length, words: lessons.reduce((total, lesson) => total + lesson.words.length, 0) };
