import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonCompletion, lessonAnswerProgress } from '../lib/learning/completion.ts';

test('lessons complete at exactly 80%, without rounding up below the threshold', () => {
  const words = Array.from({ length: 200 }, (_, id) => ({ id }));
  const progress = words.map(word => ({ wordId: word.id, status: 'learned' as const }));
  assert.equal(lessonCompletion(words, progress.slice(0, 159)).completed, false);
  assert.deepEqual(lessonCompletion(words, progress.slice(0, 160)), { learned: 160, percent: 80, completed: true });
  assert.equal(lessonCompletion(words, progress).completed, true);
});

test('only learned core words count, and empty or unstarted lessons are incomplete', () => {
  const words = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(lessonCompletion(words, [
    { wordId: 1, status: 'learned' }, { wordId: 1, status: 'learned' },
    { wordId: 2, status: 'learning' }, { wordId: 3, status: 'learned' },
  ]), { learned: 1, percent: 50, completed: false });
  assert.deepEqual(lessonCompletion(words, []), { learned: 0, percent: 0, completed: false });
  assert.deepEqual(lessonCompletion([], []), { learned: 0, percent: 0, completed: false });
});

test('answer progress counts core words answered correctly at least once, even after later mistakes', () => {
  const words = Array.from({ length: 40 }, (_, id) => ({ id: id + 1 }));
  const progress = Array.from({ length: 20 }, (_, id) => ({ wordId: id + 1, reviews: 4, correct: 1, incorrect: 3, status: 'learning' as const }));
  const mixedProgress = [
    ...progress,
    { wordId: 1, reviews: 10, correct: 8, incorrect: 2, status: 'learned' },
    { wordId: 10001, reviews: 3, correct: 3, incorrect: 0, status: 'learned' },
    { wordId: 21, reviews: 5, correct: 0, incorrect: 5, status: 'learning' },
    { wordId: 22, reviews: 1, correct: 0, incorrect: 0, status: 'learned' },
  ];
  assert.deepEqual(lessonAnswerProgress(words, mixedProgress), { answeredCorrectly: 20, percent: 50 });
  assert.deepEqual(lessonAnswerProgress(words, []), { answeredCorrectly: 0, percent: 0 });
  assert.deepEqual(lessonAnswerProgress([], progress), { answeredCorrectly: 0, percent: 0 });
  assert.deepEqual(lessonAnswerProgress(words, words.map(word => ({ wordId: word.id, correct: 1 }))), { answeredCorrectly: 40, percent: 100 });
});
