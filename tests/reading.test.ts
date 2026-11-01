import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradeExercise, ExerciseStore } from '../lib/essential/store.ts';
import type { BookUnit, EssentialLesson } from '../lib/essential/types.ts';

const unit: BookUnit = {
  id: 'essential-01-reading-5', title: 'Part 5', pages: [], questions: [{
    id: '10', label: 'Câu 10', choices: ['A', 'B', 'C', 'D'], answer: 'A',
    prompt: 'The two sides were no closer to a final ____ at midnight than they were at noon.',
    choiceTexts: { A: 'agreement', B: 'agreeable', C: 'agree', D: 'agreed' },
    explanation: 'Sau “a final” cần danh từ; agreement nghĩa là thỏa thuận.',
  }],
};
const request = { id: 'reading-attempt-01', unitId: unit.id, durationMs: 2000, answers: { '10': 'B' } };

test('submitted Reading returns the chosen text, correct text and explanation, including wrong answers', () => {
  const result = gradeExercise(request, unit);
  assert.equal(result.score, 0);
  assert.equal(result.results[0].prompt, unit.questions[0].prompt);
  assert.equal(result.results[0].answerText, 'agreeable');
  assert.equal(result.results[0].expectedText, 'agreement');
  assert.equal(result.results[0].explanation, unit.questions[0].explanation);
});

test('Reading explanations survive saved history and a correct retry', () => {
  const store = new ExerciseStore(':memory:');
  try {
    store.save(request, unit);
    const retry = store.save({ ...request, id: 'reading-attempt-02', retryOf: request.id, answers: { '10': ' a ' } }, unit);
    assert.equal(retry.score, 1);
    assert.equal(retry.results[0].answerText, 'agreement');
    assert.equal(store.read(unit.id)[1].results[0].explanation, unit.questions[0].explanation);
  } finally { store.close(); }
});

test('all 700 Reading questions contain full text, four options and explanations', () => {
  const book = JSON.parse(readFileSync(new URL('../data/essential/book.json', import.meta.url), 'utf8')) as EssentialLesson[];
  let count = 0;
  for (const lesson of book) for (const unit of lesson.sections.reading.units) {
    if (!unit.id.endsWith('-5')) assert.ok(unit.readingPassage && unit.readingPassage.length > 150, unit.id);
    for (const q of unit.questions) {
      assert.ok(q.prompt && q.prompt.length > 15, `${unit.id}/${q.id}: prompt`);
      assert.deepEqual(Object.keys(q.choiceTexts ?? {}).sort(), ['A', 'B', 'C', 'D'], `${unit.id}/${q.id}: options`);
      assert.ok(Object.values(q.choiceTexts!).every(text => text.trim()), `${unit.id}/${q.id}: text`);
      assert.ok(q.explanation && q.explanation.length > 30, `${unit.id}/${q.id}: explanation`);
      count++;
    }
  }
  assert.equal(count, 700);
});

test('Part 6 passages contain each numbered blank once', () => {
  const book = JSON.parse(readFileSync(new URL('../data/essential/book.json', import.meta.url), 'utf8')) as EssentialLesson[];
  for (const lesson of book) {
    const unit = lesson.sections.reading.units.find(unit => unit.id.endsWith('-6'))!;
    assert.deepEqual([...unit.readingPassage!.matchAll(/\[(\d+)\]/g)].map(match => match[1]), ['16', '17', '18'], unit.id);
  }
});

test('verified source-key corrections grade the grammatically correct options', () => {
  const book = JSON.parse(readFileSync(new URL('../data/essential/book.json', import.meta.url), 'utf8')) as EssentialLesson[];
  const corrections: [number, string, string, string][] = [
    [14, '5', '10', 'C'], [14, '5', '11', 'C'], [14, '5', '12', 'C'], [14, '5', '14', 'B'], [14, '5', '15', 'A'],
    [19, '5', '13', 'D'], [19, '5', '14', 'A'], [19, '5', '15', 'A'], [46, '6', '18', 'B'],
  ];
  for (const [lesson, part, id, answer] of corrections) {
    const unit = book[lesson - 1].sections.reading.units.find(unit => unit.id.endsWith(`-${part}`))!;
    const result = gradeExercise({ id: 'correction-test-id', unitId: unit.id, durationMs: 0, answers: { [id]: answer } }, unit, [id]);
    assert.equal(result.score, 1, `${unit.id}/${id}`);
    assert.ok(result.results[0].sourceNote);
    assert.ok(result.results[0].explanation);
  }
});
