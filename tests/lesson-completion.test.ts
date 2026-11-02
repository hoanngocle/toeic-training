import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonCompletion } from '../lib/learning/completion.ts';

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
