import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { EssentialLesson } from '../lib/essential/types.ts';
import { gradeExercise } from '../lib/essential/grading.ts';
import { toPublicBookUnit } from '../lib/essential/public.ts';

const book = JSON.parse(readFileSync(new URL('../data/essential/book.json', import.meta.url), 'utf8')) as EssentialLesson[];

test('all context lessons return full Vietnamese translations and explanations after grading, including retries', () => {
  for (const lesson of book) {
    const unit = lesson.sections.context.units[0];
    assert.ok(unit.passageTranslation && unit.passageTranslation.length > 200, lesson.slug);
    assert.doesNotMatch(unit.passageTranslation, /\{\{\d+\}\}/);
    for (const question of unit.questions) assert.ok(question.explanation && question.explanation.length > 25, `${unit.id}/${question.id}`);
    const result = gradeExercise({ id: 'context-review-123', unitId: unit.id, durationMs: 1000, answers: Object.fromEntries(unit.questions.map(q => [q.id, 'wrong answer'])) }, unit);
    assert.equal(result.passageTranslation, unit.passageTranslation);
    assert.equal(result.score, 0);
    assert.ok(result.results.every(answer => answer.explanation));
    const retry = gradeExercise({ id: 'context-retry-123', unitId: unit.id, durationMs: 1000, answers: { '1': unit.questions[0].answer } }, unit, ['1']);
    assert.equal(retry.passageTranslation, unit.passageTranslation);
    assert.equal(retry.results[0].explanation, unit.questions[0].explanation);
    const publicUnit = toPublicBookUnit(unit);
    assert.equal('passageTranslation' in publicUnit, false);
    assert.ok(publicUnit.questions.every(q => !('explanation' in q) && !('answer' in q)));
  }
});

test('context review authoring source matches the imported book', () => {
  const source = JSON.parse(readFileSync(new URL('../data/essential/context-review.json', import.meta.url), 'utf8'));
  for (const lesson of book) {
    const unit = lesson.sections.context.units[0];
    assert.equal(unit.passageTranslation, source[lesson.slug].translation);
    assert.deepEqual(unit.questions.map(q => q.explanation), source[lesson.slug].explanations);
  }
});
