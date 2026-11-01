import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradeAnswer, meanings, makeQuestions } from '../lib/learning/practice.ts';
const lessons = JSON.parse(readFileSync(new URL('../data/vocabulary/lessons.json', import.meta.url), 'utf8'));

test('Writing accepts a listed meaning, optional annotations and normalized case/spacing, not partial or accentless answers', () => {
  const word = { id: 1, spokenText: 'cash register', meaning: 'máy tính tiền (ở quầy thu ngân), quầy thu ngân' };
  assert.equal(gradeAnswer(word, 'en-vi', '  MÁY   TÍNH TIỀN. '), true);
  assert.equal(gradeAnswer(word, 'en-vi', 'quầy thu ngân'), true);
  assert.equal(gradeAnswer(word, 'en-vi', 'may tinh tien'), false);
  assert.equal(gradeAnswer(word, 'en-vi', 'tiền'), false);
  assert.equal(gradeAnswer(word, 'vi-en', ' CASH REGISTER '), true);
  assert.equal(gradeAnswer(word, 'vi-en', ''), false);
  assert.deepEqual(meanings('cởi ra (quần áo, giày dép), tháo ra'), ['cởi ra', 'tháo ra']);
});

test('Every lesson generates 20 unique mixed questions with four unambiguous choices', () => {
  for (const lesson of lessons) {
    for (let run = 0; run < 3; run++) {
      const questions = makeQuestions(lesson.words);
      assert.equal(questions.length, 20);
      assert.equal(new Set(questions.map(q => q.wordId)).size, 20);
      assert.equal(questions.filter(q => q.direction === 'en-vi').length, 10);
      for (const q of questions) {
        assert.equal(q.choices.length, 4);
        assert.equal(new Set(q.choices).size, 4);
        const word = lesson.words.find((w: {id: number}) => w.id === q.wordId);
        assert.equal(q.choices.filter(choice => gradeAnswer(word, q.direction, choice)).length, 1);
      }
    }
  }
});

test('Retry questions include only requested words and handle a single wrong word', () => {
  const questions = makeQuestions(lessons[1].words, [3]);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].wordId, 3);
  assert.equal(questions[0].choices.length, 4);
});

test('Writing accepts each listed meaning with its explanatory parentheses intact', () => {
  const word = {id:1, spokenText:'turn up', meaning:'xuất hiện, tăng lên (âm lượng, nhiệt độ)'};
  assert.equal(gradeAnswer(word, 'en-vi', 'tăng lên (âm lượng, nhiệt độ)'), true);
  assert.equal(gradeAnswer(word, 'en-vi', 'tăng lên'), true);
  assert.equal(gradeAnswer(word, 'en-vi', 'nhiệt độ'), false);
});

test('Typing generates balanced questions without exposing choices, even for a small vocabulary', () => {
  const words = lessons[0].words.slice(0, 2);
  const questions = makeQuestions(words, undefined, 'typing');
  assert.equal(questions.length, 2);
  assert.equal(questions.filter(q => q.direction === 'en-vi').length, 1);
  for (const question of questions) {
    assert.deepEqual(question.choices, []);
    const word = words.find((word: { id: number }) => word.id === question.wordId);
    assert.equal(question.prompt, question.direction === 'en-vi' ? word.spokenText : word.meaning);
  }
  const retry = makeQuestions(words, [words[1].id], 'typing');
  assert.deepEqual(retry.map(q => q.wordId), [words[1].id]);
  assert.deepEqual(retry[0].choices, []);
});
