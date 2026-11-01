import test from 'node:test';
import assert from 'node:assert/strict';
import { toPublicBookUnit } from '../lib/essential/public.ts';

test('public Reading contains passage and options but no answer or explanation', () => {
  const unit = toPublicBookUnit({ id: 'reading', title: 'Reading', pages: [], readingPassage: 'A passage', questions: [{
    id: '10', label: 'Câu 10', prompt: 'The prompt', choices: ['A', 'B'], choiceTexts: { A: 'first', B: 'second' }, answer: 'B', explanation: 'Private explanation', sourceNote: 'Private correction note',
  }] });
  assert.equal(unit.readingPassage, 'A passage');
  assert.equal(unit.questions[0].prompt, 'The prompt');
  assert.deepEqual(unit.questions[0].choiceTexts, { A: 'first', B: 'second' });
  assert.equal('answer' in unit.questions[0], false);
  assert.equal('explanation' in unit.questions[0], false);
  assert.equal('sourceNote' in unit.questions[0], false);
});
