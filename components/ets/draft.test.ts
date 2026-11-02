import test from 'node:test';
import assert from 'node:assert/strict';
import { draftKey, createDraft, restoreDraft, submissionPayload } from './draft.ts';

test('drafts isolate accounts and test/part scopes', () => {
  assert.notEqual(draftKey('alice', 1, 0), draftKey('bob', 1, 0));
  assert.notEqual(draftKey('alice', 1, 0), draftKey('alice', 1, 1));
});
test('reload preserves deadline and expired attempt submission identity', () => {
  const draft = createDraft('attempt-1', 0, 1000);
  draft.answers = { '1': 'B' };
  const restored = restoreDraft(JSON.stringify(draft));
  assert.equal(restored?.deadline, 7201000);
  assert.deepEqual(submissionPayload(restored!, 1, 0, 9000000), { id: 'attempt-1', testId: 1, part: 0, answers: { '1': 'B' }, durationMs: 7200000 });
});
test('pending submission is frozen across reload and retry', () => {
  const draft = createDraft('attempt-2', 3, 1000);
  draft.pending = submissionPayload(draft, 1, 3, 5000);
  const restored = restoreDraft(JSON.stringify(draft));
  assert.deepEqual(submissionPayload(restored!, 1, 3, 9000), draft.pending);
  assert.equal(draft.deadline, null);
});
test('corrupt drafts cannot silently restart a saved timer', () => {
  assert.equal(restoreDraft('{'), null);
  assert.equal(restoreDraft(JSON.stringify({ id: 'x', startedAt: 1 })), null);
});
