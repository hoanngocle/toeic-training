import type { ProgressionResult } from '../progression/types.ts';
export type EssentialTab = 'context' | 'families' | 'reading' | 'listening' | 'review';
export type BookPage = { src: string; page: number; alt: string };
export type BookQuestion = {
  id: string; label: string; choices?: string[]; answer: string;
  prompt?: string; choiceTexts?: Record<string, string>; explanation?: string; sourceNote?: string;
};
export type WordFamilyRow = { partOfSpeech: string; word: string; pronunciation: string; meaning: string; example: string; translation: string };
export type BookUnit = {
  id: string; title: string; pages: BookPage[]; questions: BookQuestion[];
  audioSrc?: string; listeningImage?: { src: string; alt: string };
  transcript?: string; transcriptPages?: BookPage[]; answerKeyPages?: BookPage[]; note?: string;
  passage?: string; passageTranslation?: string; wordBank?: string[]; readingPassage?: string;
  questionPassages?: { questionIds: string[]; text: string }[];
  referenceTable?: string[][];
  wordFamilies?: WordFamilyRow[];
};
export type BookSection = { title: string; units: BookUnit[] };
export type EssentialWord = { id: number; term: string; spokenText: string; pronunciation: string; meaning: string; definition: string; example?: { english: string; vietnamese: string } };
export type EssentialLesson = {
  slug: string; number: number; title: string; sourceTitle: string; source: 'essential';
  group: number; groupTitle: string; words: EssentialWord[]; vocabularyPages: BookPage[]; sections: Record<EssentialTab, BookSection>;
};
export type PublicBookUnit = Omit<BookUnit, 'questions' | 'passageTranslation'> & { questions: Omit<BookQuestion, 'answer' | 'explanation' | 'sourceNote'>[] };
export type PublicBookSection = { title: string; units: PublicBookUnit[] };
export type ExerciseRequest = { id: string; unitId: string; durationMs: number; answers: Record<string, string>; retryOf?: string };
export type ExerciseResult = ProgressionResult & { id: string; unitId: string; createdAt: string; durationMs: number; score: number; total: number; passageTranslation?: string; results: {
  questionId: string; label: string; answer: string; expected: string; correct: boolean;
  prompt?: string; answerText?: string; expectedText?: string; explanation?: string; sourceNote?: string;
}[] };
