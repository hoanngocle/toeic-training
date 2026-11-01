import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradeExercise } from '../lib/essential/store.ts';
import { toPublicBookUnit } from '../lib/essential/public.ts';
import type { EssentialLesson } from '../lib/essential/types.ts';
const book = JSON.parse(readFileSync(new URL('../data/essential/book.json', import.meta.url), 'utf8')) as EssentialLesson[];
test('all Word Reviews are complete text exercises without PDF pages', () => {
  const ids = new Set<string>();
  for (const lesson of book) {
    const unit = lesson.sections.review.units[0];
    ids.add(unit.id);
    assert.equal(unit.questions.length, 19);
    assert.deepEqual(unit.pages, []);
    assert.deepEqual(unit.answerKeyPages, []);
    assert.equal(unit.questionPassages?.length, 3);
    assert.deepEqual(unit.questionPassages?.flatMap(p => p.questionIds), Array.from({ length: 9 }, (_, i) => String(i + 11)));
    for (const q of unit.questions) {
      assert.ok(q.prompt?.includes('____'), `${unit.id}/${q.id}`);
      assert.deepEqual(Object.keys(q.choiceTexts ?? {}).sort(), ['A', 'B', 'C', 'D']);
      assert.ok(Object.values(q.choiceTexts!).every(text => text.trim()));
    }
    for (const passage of unit.questionPassages ?? []) {
      assert.ok(passage.text.length > 150);
      for (const id of passage.questionIds) assert.equal(passage.text.split(`[${id}]`).length, 2);
    }
    const publicUnit = toPublicBookUnit(unit);
    assert.ok(publicUnit.questions.every(q => !('answer' in q)));
    const result = gradeExercise({ id: 'review-complete', unitId: unit.id, durationMs: 0, answers: Object.fromEntries(unit.questions.map(q => [q.id, q.answer])) }, unit);
    assert.equal(result.score, 19);
    assert.ok(result.results.every(q => q.expectedText && q.prompt));
  }
  assert.equal(ids.size, 10);
});
