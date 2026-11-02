import { gradeAnswer, normalizeAnswer } from './practice.ts';
import type { Word } from './practice.ts';
import type { SaveRequest, Session } from './types.ts';

export class InputError extends Error {}
export function validateRequest(input: unknown, words: Word[]): SaveRequest {
  if (!input || typeof input !== 'object') throw new InputError('Dữ liệu không hợp lệ.');
  const value = input as SaveRequest;
  if (typeof value.id !== 'string' || !/^[\w-]{10,80}$/.test(value.id) || typeof value.lesson !== 'string' || !/^(?:lesson-\d+|essential-(?:0[1-9]|[1-4]\d|50))$/.test(value.lesson) ||
      !['flashcard', 'writing', 'test'].includes(value.mode) || !Number.isInteger(value.durationMs) || value.durationMs < 0 || value.durationMs > 86400000 ||
      !Array.isArray(value.answers) || value.answers.length < 1 || value.answers.length > 20 ||
      (value.mode !== 'test' && value.answers.length !== 1)) throw new InputError('Dữ liệu lượt học không hợp lệ.');
  if (value.retryOf !== undefined && (value.mode !== 'test' || typeof value.retryOf !== 'string' || !/^[\w-]{10,80}$/.test(value.retryOf))) throw new InputError('Lượt ôn lại không hợp lệ.');
  if ((value.includeWordFamilies !== undefined && typeof value.includeWordFamilies !== 'boolean') ||
      (value.includeWordFamilies && (value.mode === 'flashcard' || !words.some(word => word.family)))) throw new InputError('Tùy chọn Word Families không hợp lệ.');
  const ids = new Set<number>();
  for (const answer of value.answers) {
    if (!answer || !Number.isInteger(answer.wordId) || !words.some(word => word.id === answer.wordId && (!word.family || value.includeWordFamilies)) || ids.has(answer.wordId) ||
        !['en-vi','vi-en'].includes(answer.direction) || typeof answer.answer !== 'string' || answer.answer.length > 2000 ||
        (value.mode === 'writing' && !answer.answer.trim()) ||
        (value.mode === 'flashcard' && !['known','learning'].includes(answer.answer))) throw new InputError('Câu trả lời không hợp lệ.');
    ids.add(answer.wordId);
  }
  return { id: value.id, lesson: value.lesson, mode: value.mode, durationMs: value.durationMs,
    ...(value.retryOf ? {retryOf:value.retryOf} : {}),
    ...(value.includeWordFamilies ? {includeWordFamilies:true} : {}),
    answers: value.answers.map(({wordId, direction, answer}) => ({wordId, direction, answer})) };
}

export function gradeLearning(input: unknown, words: Word[], createdAt = new Date().toISOString()) {
  const request = validateRequest(input, words);
      const results = request.answers.map(answer => {
        const word = words.find(word => word.id === answer.wordId)!;
        return {...answer, term: word.spokenText, meaning: word.meaning,
          ...(word.partOfSpeech ? {partOfSpeech:word.partOfSpeech} : {}),
          ...(word.family && word.example ? {example:word.example} : {}),
          expected: answer.direction === 'en-vi' ? word.meaning : word.acceptedForms?.join(' / ') ?? word.spokenText,
          correct: request.mode === 'flashcard' ? answer.answer === 'known' : gradeAnswer(word, answer.direction, answer.answer)};
      });
      const result: Session = {id: request.id, lesson: request.lesson, mode: request.mode, durationMs: request.durationMs, createdAt,
        ...(request.includeWordFamilies ? {includeWordFamilies:true} : {}),
        fullTest: request.mode === 'test' && !request.retryOf && results.length === Math.min(20, new Set(words.filter(word => request.includeWordFamilies || !word.family).map(word => normalizeAnswer(word.spokenText))).size),
        total: results.length, score: request.mode === 'flashcard' ? null : results.filter(answer => answer.correct).length, results};
  return {request,result};
}
