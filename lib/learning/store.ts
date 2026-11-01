import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { gradeAnswer } from './practice.ts';
import type { Word } from './practice.ts';
import type { LearningState, Progress, SaveRequest, Session } from './types.ts';

export class InputError extends Error {}
export function validateRequest(input: unknown, words: Word[]): SaveRequest {
  if (!input || typeof input !== 'object') throw new InputError('Dữ liệu không hợp lệ.');
  const value = input as SaveRequest;
  if (typeof value.id !== 'string' || !/^[\w-]{10,80}$/.test(value.id) || typeof value.lesson !== 'string' || !/^(?:lesson-\d+|essential-(?:0[1-9]|[1-4]\d|50))$/.test(value.lesson) ||
      !['flashcard', 'writing', 'test'].includes(value.mode) || !Number.isInteger(value.durationMs) || value.durationMs < 0 || value.durationMs > 86400000 ||
      !Array.isArray(value.answers) || value.answers.length < 1 || value.answers.length > 20 ||
      (value.mode !== 'test' && value.answers.length !== 1)) throw new InputError('Dữ liệu lượt học không hợp lệ.');
  const ids = new Set<number>();
  for (const answer of value.answers) {
    if (!answer || !Number.isInteger(answer.wordId) || !words.some(word => word.id === answer.wordId) || ids.has(answer.wordId) ||
        !['en-vi','vi-en'].includes(answer.direction) || typeof answer.answer !== 'string' || answer.answer.length > 2000 ||
        (value.mode === 'writing' && !answer.answer.trim()) ||
        (value.mode === 'flashcard' && !['known','learning'].includes(answer.answer))) throw new InputError('Câu trả lời không hợp lệ.');
    ids.add(answer.wordId);
  }
  return { id: value.id, lesson: value.lesson, mode: value.mode, durationMs: value.durationMs,
    answers: value.answers.map(({wordId, direction, answer}) => ({wordId, direction, answer})) };
}

export class LearningStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive:true});
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, lesson TEXT NOT NULL, mode TEXT NOT NULL,
        created_at TEXT NOT NULL, request TEXT NOT NULL, result TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_lesson_date ON sessions(lesson, created_at DESC);
      CREATE TABLE IF NOT EXISTS progress (
        lesson TEXT NOT NULL, word_id INTEGER NOT NULL, reviews INTEGER NOT NULL DEFAULT 0,
        correct INTEGER NOT NULL DEFAULT 0, incorrect INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, last_reviewed_at TEXT NOT NULL,
        PRIMARY KEY (lesson, word_id)
      );`);
  }
  close() { this.db.close(); }
  read(lesson: string): LearningState {
    const progress = this.db.prepare('SELECT word_id AS wordId, reviews, correct, incorrect, streak, status, last_reviewed_at AS lastReviewedAt FROM progress WHERE lesson = ? ORDER BY word_id').all(lesson) as unknown as Progress[];
    const sessions = this.db.prepare("SELECT result FROM sessions WHERE lesson = ? AND mode != 'flashcard' ORDER BY created_at DESC, rowid DESC LIMIT 50").all(lesson).map(row => JSON.parse(String(row.result)) as Session);
    const count = this.db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE lesson = ? AND mode != 'flashcard'").get(lesson);
    return {progress, sessions, totalSessions: Number(count?.count ?? 0)};
  }
  save(input: unknown, words: Word[]): Session {
    const request = validateRequest(input, words);
    const serialized = JSON.stringify(request);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT request, result FROM sessions WHERE id = ?').get(request.id);
      if (existing) {
        if (existing.request !== serialized) throw new InputError('Mã lượt học đã được sử dụng cho dữ liệu khác.');
        this.db.exec('COMMIT');
        return JSON.parse(String(existing.result)) as Session;
      }
      const createdAt = new Date().toISOString();
      const results = request.answers.map(answer => {
        const word = words.find(word => word.id === answer.wordId)!;
        return {...answer, term: word.spokenText, meaning: word.meaning,
          expected: answer.direction === 'en-vi' ? word.meaning : word.spokenText,
          correct: request.mode === 'flashcard' ? answer.answer === 'known' : gradeAnswer(word, answer.direction, answer.answer)};
      });
      const result: Session = {id: request.id, lesson: request.lesson, mode: request.mode, durationMs: request.durationMs, createdAt,
        total: results.length, score: request.mode === 'flashcard' ? null : results.filter(answer => answer.correct).length, results};
      this.db.prepare('INSERT INTO sessions (id, lesson, mode, created_at, request, result) VALUES (?, ?, ?, ?, ?, ?)').run(request.id, request.lesson, request.mode, createdAt, serialized, JSON.stringify(result));
      for (const answer of results) {
        const old = this.db.prepare('SELECT * FROM progress WHERE lesson = ? AND word_id = ?').get(request.lesson, answer.wordId);
        const isFlash = request.mode === 'flashcard';
        const streak = answer.correct ? Number(old?.streak ?? 0) + (isFlash ? 0 : 1) : 0;
        const status = !answer.correct ? 'learning' : (isFlash || streak >= 3 || old?.status === 'learned') ? 'learned' : 'learning';
        this.db.prepare(`INSERT INTO progress (lesson, word_id, reviews, correct, incorrect, streak, status, last_reviewed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(lesson, word_id) DO UPDATE SET
          reviews=excluded.reviews, correct=excluded.correct, incorrect=excluded.incorrect,
          streak=excluded.streak, status=excluded.status, last_reviewed_at=excluded.last_reviewed_at`).run(
          request.lesson, answer.wordId, Number(old?.reviews ?? 0)+1,
          Number(old?.correct ?? 0)+(isFlash ? 0 : Number(answer.correct)),
          Number(old?.incorrect ?? 0)+(isFlash ? 0 : Number(!answer.correct)), streak, status, createdAt);
      }
      this.db.exec('COMMIT');
      return result;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
