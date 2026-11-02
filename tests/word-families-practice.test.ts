import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as practice from '../lib/learning/practice.ts';
import { gradeLearning } from '../lib/learning/grading.ts';
import { LearningStore } from '../lib/learning/store.ts';
import type { EssentialLesson } from '../lib/essential/types.ts';

const book = JSON.parse(readFileSync(new URL('../data/essential/book.json', import.meta.url), 'utf8')) as EssentialLesson[];

test('all 50 lessons offer unique additional family forms with stable IDs and valid tests in both formats', () => {
  assert.equal(typeof practice.withWordFamilies, 'function');
  for (const lesson of book) {
    const rows = lesson.sections.families.units[0].wordFamilies!;
    const words = practice.withWordFamilies(lesson.words, rows);
    assert.ok(words.length > lesson.words.length, lesson.slug);
    assert.equal(new Set(words.map(w => w.id)).size, words.length);
    assert.equal(new Set(words.map(w => practice.normalizeAnswer(w.spokenText))).size, words.length);
    assert.deepEqual(words.slice(0, 12), lesson.words);
    assert.deepEqual(words, practice.withWordFamilies(lesson.words, rows));
    for (const format of ['multiple-choice', 'typing'] as const) {
      const questions = practice.makeQuestions(words, undefined, format);
      assert.equal(questions.length, Math.min(20, words.length));
      assert.ok(questions.some(q => words.find(w => w.id === q.wordId)?.family));
      for (const q of questions) {
        const word = words.find(w => w.id === q.wordId)!;
        if (word.family) assert.ok(q.prompt.includes(word.partOfSpeech!), `${lesson.slug}/${word.spokenText}`);
        if (format === 'multiple-choice') assert.equal(q.choices.filter(choice => practice.gradeAnswer(word, q.direction, choice)).length, 1);
        else assert.deepEqual(q.choices, []);
      }
    }
  }
});

test('family scope is validated server-side, returns metadata, and does not change ordinary full-test grading', () => {
  assert.equal(typeof practice.withWordFamilies, 'function');
  const lesson = book[0];
  const words = practice.withWordFamilies(lesson.words, lesson.sections.families.units[0].wordFamilies!);
  const agree = words.find(w => w.family && w.spokenText === 'agree')!;
  const request = { id: 'family-writing-123', lesson: lesson.slug, mode: 'writing', includeWordFamilies: true, durationMs: 20, answers: [{ wordId: agree.id, direction: 'vi-en', answer: 'AGREE' }] };
  const graded = gradeLearning(request, words);
  assert.equal(graded.result.score, 1);
  assert.equal(graded.request.includeWordFamilies, true);
  assert.equal(graded.result.includeWordFamilies, true);
  assert.equal(graded.result.results[0].partOfSpeech, 'verb');
  assert.equal(graded.result.results[0].example?.english, 'If both parties agree to the terms, we can finalize the contract.');
  for (const invalid of [false, undefined, 'true', 1]) assert.throws(() => gradeLearning({ ...request, includeWordFamilies: invalid }, words));
  assert.throws(() => gradeLearning({ ...request, mode: 'flashcard', answers: [{ ...request.answers[0], answer: 'known' }] }, words));
  assert.throws(() => gradeLearning(request, lesson.words));
  const base = gradeLearning({ ...request, mode: 'test', includeWordFamilies: undefined, answers: lesson.words.map(w => ({ wordId: w.id, direction: 'en-vi', answer: w.meaning })) }, words);
  assert.equal(base.result.fullTest, true);
  assert.equal(base.result.score, 12);
});

test('mixed family tests and scoped retries keep their scope and metadata when saved', () => {
  assert.equal(typeof practice.withWordFamilies, 'function');
  const lesson = book[0];
  const words = practice.withWordFamilies(lesson.words, lesson.sections.families.units[0].wordFamilies!);
  const questions = practice.makeQuestions(words, undefined, 'typing');
  const wrongId = questions.find(q => words.find(w => w.id === q.wordId)?.family)!.wordId;
  const input = { id: 'family-test-12345', lesson: lesson.slug, mode: 'test', includeWordFamilies: true, durationMs: 20, answers: questions.map(q => {
    const word = words.find(w => w.id === q.wordId)!;
    return { wordId: q.wordId, direction: q.direction, answer: q.wordId === wrongId ? 'wrong' : q.direction === 'vi-en' ? word.spokenText : word.meaning };
  }) };
  const store = new LearningStore(':memory:');
  try {
    const first = store.save(input, words);
    assert.equal(first.fullTest, true);
    assert.equal(first.score, first.total - 1);
    const retry = store.save({ ...input, id: 'family-retry-12345', retryOf: input.id, answers: [{ wordId: wrongId, direction: 'vi-en', answer: words.find(w => w.id === wrongId)!.spokenText }] }, words);
    assert.equal(retry.score, 1);
    assert.equal(retry.fullTest, false);
    assert.equal(retry.includeWordFamilies, true);
    assert.ok(store.read(lesson.slug).sessions.every(s => s.includeWordFamilies));
    assert.deepEqual(practice.makeQuestions(words, [wrongId], 'typing').map(q => q.wordId), [wrongId]);
  } finally { store.close(); }
});

test('identical family meaning and part-of-speech prompts accept both valid English forms', () => {
  const lesson = book[20];
  const words = practice.withWordFamilies(lesson.words, lesson.sections.families.units[0].wordFamilies!);
  const deductible = words.find(w => w.spokenText === 'deductible')!;
  const deduction = words.find(w => w.spokenText === 'deduction')!;
  assert.equal(practice.wordPrompt(deductible, 'vi-en'), 'khoản khấu trừ (noun)');
  assert.equal(practice.wordPrompt(deduction, 'vi-en'), 'khoản khấu trừ (noun)');
  assert.equal(practice.gradeAnswer(deductible, 'vi-en', 'deduction'), true);
  assert.equal(practice.gradeAnswer(deduction, 'vi-en', 'deductible'), true);
  assert.equal(practice.gradeAnswer(deduction, 'vi-en', 'deduct'), false);
  const {result} = gradeLearning({ id: 'family-synonym-123', lesson: lesson.slug, mode: 'writing', includeWordFamilies: true, durationMs: 1, answers: [{ wordId: deduction.id, direction: 'vi-en', answer: 'deductible' }] }, words);
  assert.equal(result.score, 1);
  assert.match(result.results[0].expected, /deductible/);
  assert.match(result.results[0].expected, /deduction/);
});
