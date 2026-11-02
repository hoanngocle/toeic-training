import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toPublicEtsTest } from '../lib/ets/public.ts';
import { gradeEts, EtsInputError } from '../lib/ets/grading.ts';
import type { EtsTest } from '../lib/ets/types.ts';
import { database, alice, bob } from './helpers/progression-db.ts';
import { audioPath, parseAudioRange } from '../lib/ets/audio.ts';

const source: EtsTest = { id: 1, title: 'Fixture', audioSrc: '/test.mp3', parts: [
  { number: 1, title: 'Photos', groups: [{ id: 'g1', blocks: [{ type: 'image', src: '/photo.png' }], transcript: 'spoken secret', questions: [{ number: 1, prompt: 'spoken question', choices: [{ label: 'A', text: 'spoken A' }, { label: 'B', text: 'spoken B' }], answer: 'A' }] }] },
  { number: 5, title: 'Reading', groups: [{ id: 'g5', blocks: [{ type: 'text', text: 'Read this' }], questions: [{ number: 101, prompt: 'Choose', choices: [{ label: 'A', text: 'one' }, { label: 'B', text: 'two' }], answer: 'B' }] }] },
] };
const input = { id: 'ets-attempt-0001', testId: 1, part: 0, durationMs: 1000, answers: { '1': 'A' } };

test('audio only resolves known test/Part combinations and supports byte seek and suffix ranges', () => {
  assert.match(audioPath(1, 0)!, /Test_01\.mp3$/);
  assert.match(audioPath(5, 2)!, /PART 2 - TEST 5\.mp3$/);
  assert.match(audioPath(6, 2)!, /Test_06\.mp3$/);
  for (const [test, part] of [[0, 0], [11, 0], [1, 5], [1, -1], [1.5, 1]]) assert.equal(audioPath(test, part), undefined);
  assert.deepEqual(parseAudioRange('bytes=3-6', 10), { start: 3, end: 6 });
  assert.deepEqual(parseAudioRange('bytes=7-', 10), { start: 7, end: 9 });
  assert.deepEqual(parseAudioRange('bytes=-4', 10), { start: 6, end: 9 });
  assert.deepEqual(parseAudioRange('bytes=0-999', 10), { start: 0, end: 9 });
  for (const range of ['bytes=11-', 'bytes=5-1', 'bytes=-0', 'bytes=1-2,4-5', 'nope']) assert.equal(parseAudioRange(range, 10), null);
});

test('public projection strips answers, transcripts, and spoken Part 1 alternatives without mutating source', () => {
  const result = toPublicEtsTest(source);
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.ok(!('answer' in result.parts[0].groups[0].questions[0]));
  assert.equal(result.parts[0].groups[0].questions[0].prompt, '');
  assert.deepEqual(result.parts[0].groups[0].questions[0].choices, [{ label: 'A', text: '' }, { label: 'B', text: '' }]);
  assert.equal(result.parts[1].groups[0].questions[0].choices[1].text, 'two');
  assert.equal(source.parts[0].groups[0].questions[0].choices[0].text, 'spoken A');
});

test('ETS grading counts omitted and empty answers wrong and limits results and transcripts to selected Part', () => {
  const result = gradeEts(input, source);
  assert.equal(result.score, 1); assert.equal(result.total, 2);
  assert.deepEqual(result.results[1], { number: 101, selected: '', expected: 'B', correct: false });
  const part = gradeEts({ ...input, part: 5, answers: { '101': '' } }, source);
  assert.equal(part.score, 0); assert.equal(part.total, 1); assert.deepEqual(part.transcripts, {});
});

test('ETS rejects unknown questions, labels, test, Part and unsafe durations', () => {
  for (const change of [{ testId: 2 }, { part: 2 }, { part: -1 }, { part: '5' }, { answers: { '999': 'A' } }, { answers: { '1': 'C' } }, { answers: { '01': 'A' } }, { answers: [] }, { durationMs: -1 }, { durationMs: 1.2 }, { durationMs: Infinity }, { durationMs: 7200001 }, { id: '' }]) {
    assert.throws(() => gradeEts({ ...input, ...change }, source), EtsInputError, JSON.stringify(change));
  }
});

test('ETS database preserves first result, rejects changed duplicates, isolates users and grants no browser writes', async () => {
  const db = await database(false);
  try {
    await db.exec(readFileSync(new URL('../supabase/migrations/202611020003_ets.sql', import.meta.url), 'utf8'));
    const result = gradeEts(input, source);
    const save = (user: string, request: unknown, value = result) => db.query<{ result: typeof result }>('SELECT public.save_ets($1,$2::jsonb,$3::jsonb) result', [user, JSON.stringify(request), JSON.stringify(value)]);
    await save(alice, input);
    const repeated = await save(alice, input, { ...result, score: 999 });
    assert.equal(repeated.rows[0].result.score, 1);
    await assert.rejects(save(alice, { ...input, answers: {} }), /REQUEST_CONFLICT/);
    await save(bob, input);
    await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${alice}',false);`);
    assert.equal((await db.query('SELECT * FROM public.ets_sessions')).rows.length, 1);
    await assert.rejects(db.query('DELETE FROM public.ets_sessions'), /permission denied/);
    await assert.rejects(save(alice, input), /permission denied/);
    await db.exec('RESET ROLE');
    assert.equal((await db.query('SELECT * FROM public.sessions')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM public.essential_sessions')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM public.activity_days')).rows.length, 0);
  } finally { await db.close(); }
});
