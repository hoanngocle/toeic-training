import assert from 'node:assert/strict';
import test from 'node:test';
import { initialExercise, exerciseReducer } from './exercise-state.ts';
import type { ExerciseRequest, ExerciseResult } from '../../../lib/essential/types.ts';

const payload: ExerciseRequest = { id: 'attempt-1', unitId: 'unit-1', durationMs: 1200, answers: { q1: 'A', q2: 'B' } };
const result: ExerciseResult = { ...payload, createdAt: '2026-10-31T00:00:00Z', score: 1, total: 2, results: [
  { questionId: 'q1', label: '1', answer: 'A', expected: 'A', correct: true },
  { questionId: 'q2', label: '2', answer: 'B', expected: 'C', correct: false },
] };

test('failed submissions retain the exact payload and answers until retry succeeds', () => {
  let state = initialExercise();
  state = exerciseReducer(state, { type: 'answer', id: 'q1', value: 'A' });
  state = exerciseReducer(state, { type: 'answer', id: 'q2', value: 'B' });
  state = exerciseReducer(state, { type: 'submit', payload });
  state = exerciseReducer(state, { type: 'failure', error: 'offline' });
  state = exerciseReducer(state, { type: 'answer', id: 'q1', value: 'D' });
  state = exerciseReducer(state, { type: 'restart' });
  assert.deepEqual(state.answers, { q1: 'A', q2: 'B' });
  assert.equal(state.pending, payload);
  state = exerciseReducer(state, { type: 'submit', payload: { ...payload, id: 'different' } });
  assert.equal(state.pending, payload);
  assert.equal(state.saving, true);
  state = exerciseReducer(state, { type: 'success', result });
  assert.equal(state.pending, null);
  assert.equal(state.result?.score, 1);
});

test('retrying wrong answers selects only missed questions and clears the previous answers', () => {
  let state = exerciseReducer(initialExercise(), { type: 'success', result });
  state = exerciseReducer(state, { type: 'restart', ids: result.results.filter(item => !item.correct).map(item => item.questionId) });
  assert.deepEqual(state.questionIds, ['q2']);
  assert.equal(state.retryOf, 'attempt-1');
  assert.deepEqual(state.answers, {});
  assert.equal(state.result, null);
  state = exerciseReducer(state, { type: 'restart' });
  assert.equal(state.questionIds, null);
  assert.equal(state.retryOf, undefined);
});

test('exercise duration excludes hidden tabs and resets for a new attempt', async () => {
  const { createExerciseTimer, setTimerActive, exerciseDuration } = await import('./timer.ts');
  let timer = createExerciseTimer();
  assert.equal(exerciseDuration(timer, 5000), 0);
  timer = setTimerActive(timer, true, 5000);
  assert.equal(exerciseDuration(timer, 6000), 1000);
  timer = setTimerActive(timer, false, 6500);
  assert.equal(exerciseDuration(timer, 20000), 1500);
  timer = setTimerActive(timer, true, 22000);
  assert.equal(exerciseDuration(timer, 23000), 2500);
  timer = setTimerActive(timer, true, 23500);
  assert.equal(exerciseDuration(timer, 24000), 3500);
  timer = setTimerActive(timer, false, 24000);
  assert.equal(exerciseDuration(timer, 50000), 3500);
  timer = setTimerActive(createExerciseTimer(), true, 50000);
  assert.equal(exerciseDuration(timer, 51000), 1000);
});


test('failed wrong-answer retry preserves its saved-attempt link', () => {
  let state = exerciseReducer(initialExercise(), { type: 'success', result });
  state = exerciseReducer(state, { type: 'restart', ids: ['q2'] });
  const retryPayload = { id: 'attempt-2', unitId: 'unit-1', durationMs: 2500, answers: { q2: 'C' }, retryOf: state.retryOf };
  state = exerciseReducer(state, { type: 'submit', payload: retryPayload });
  state = exerciseReducer(state, { type: 'failure', error: 'offline' });
  assert.equal(state.pending?.retryOf, 'attempt-1');
  state = exerciseReducer(state, { type: 'submit', payload });
  assert.equal(state.pending, retryPayload);
});
