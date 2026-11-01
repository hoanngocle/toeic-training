import type { Direction } from './practice.ts';
export type Mode = 'flashcard' | 'writing' | 'test';
export type Answer = { wordId: number; direction: Direction; answer: string };
export type SaveRequest = { id: string; lesson: string; mode: Mode; durationMs: number; answers: Answer[] };
export type AnswerResult = Answer & { term: string; meaning: string; expected: string; correct: boolean };
export type Session = { id: string; lesson: string; mode: Mode; durationMs: number; createdAt: string; score: number | null; total: number; results: AnswerResult[] };
export type Progress = { wordId: number; reviews: number; correct: number; incorrect: number; streak: number; status: 'learning' | 'learned'; lastReviewedAt: string };
export type LearningState = { progress: Progress[]; sessions: Session[]; totalSessions: number };
