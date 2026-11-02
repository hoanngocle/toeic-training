import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as learning from '../lib/supabase/learning.ts';

function provider(responses: Record<string, { data: unknown; error: { message: string } | null; count?: number }>) {
  const queries: { table: string; calls: [string, ...unknown[]][] }[] = [];
  const client = {
    from(table: string) {
      const query = { table, calls: [] as [string, ...unknown[]][] };
      queries.push(query);
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'neq', 'order', 'limit']) {
        builder[method] = (...args: unknown[]) => { query.calls.push([method, ...args]); return builder; };
      }
      builder.then = (resolve: (value: unknown) => void) => Promise.resolve(responses[table]).then(resolve);
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, queries };
}

test('initial progress counts sessions without fetching their answer/result bodies', async () => {
  const progress = [{ wordId: 1, status: 'learned' }];
  const { client, queries } = provider({ progress: { data: progress, error: null }, sessions: { data: null, error: null, count: 72 } });
  assert.equal(typeof learning.readLearningProgress, 'function');
  const state = await learning.readLearningProgress(client, 'alice', 'essential-01');
  assert.deepEqual(state, { progress, sessions: [], totalSessions: 72 });
  assert.deepEqual(queries.find(q => q.table === 'sessions')?.calls[0], ['select', 'id', { count: 'exact', head: true }]);
  for (const query of queries) {
    assert.ok(query.calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'alice'));
    assert.ok(query.calls.some(call => call[0] === 'eq' && call[1] === 'lesson' && call[2] === 'essential-01'));
  }
});

test('history selects only display summaries, scoped and limited to the latest 50 non-flashcard sessions', async () => {
  const summaries = [{ id: 'session-01', mode: 'writing', score: 1, total: 1, createdAt: '2026-11-02T00:00:00Z', durationMs: 100 }];
  const { client, queries } = provider({ sessions: { data: summaries, error: null } });
  assert.equal(typeof learning.readLearningHistory, 'function');
  assert.deepEqual(await learning.readLearningHistory(client, 'alice', 'lesson-1'), summaries);
  assert.equal(queries.length, 1);
  const calls = queries[0].calls;
  const selection = calls[0][1] as string;
  assert.match(selection, /score:result->score/);
  assert.match(selection, /includeWordFamilies:result->includeWordFamilies/);
  assert.ok(!selection.split(',').includes('result'));
  for (const expected of [['eq', 'user_id', 'alice'], ['eq', 'lesson', 'lesson-1'], ['neq', 'mode', 'flashcard'], ['order', 'created_at', { ascending: false }], ['order', 'id'], ['limit', 50]]) {
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(expected)));
  }
});

test('split progress and history reads propagate provider failures', async () => {
  const failure = { data: null, error: { message: 'provider unavailable' } };
  const { client } = provider({ progress: failure, sessions: failure });
  assert.equal(typeof learning.readLearningProgress, 'function');
  await assert.rejects(learning.readLearningProgress(client, 'alice', 'lesson-1'), /database request failed/);
  await assert.rejects(learning.readLearningHistory(client, 'alice', 'lesson-1'), /database request failed/);
});
