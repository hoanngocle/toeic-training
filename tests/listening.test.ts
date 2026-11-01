import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import type { EssentialLesson } from '../lib/essential/types.ts';
import { toPublicBookUnit } from '../lib/essential/public.ts';
const book = JSON.parse(readFileSync(new URL('../data/essential/book.json', import.meta.url), 'utf8')) as EssentialLesson[];

test('lessons 26–50 use original audio and structured listening without exercise scans', () => {
  for (const lesson of book.slice(25)) {
    const source = JSON.parse(readFileSync(new URL(`../data/essential/listening/lesson-${lesson.number}.json`, import.meta.url), 'utf8'));
    assert.equal(source.audioSrc, `/essential/audio/track-${lesson.number}.mp3`);
    assert.ok(existsSync(`public${source.audioSrc}`));
    for (const [index, unit] of lesson.sections.listening.units.entries()) {
      assert.equal(unit.audioSrc, source.audioSrc);
      assert.deepEqual(unit.pages, []);
      assert.ok(unit.transcript && unit.transcriptPages?.length);
      assert.doesNotMatch(unit.note ?? '', /giọng đọc tổng hợp/);
      if (index === 0) assert.ok(unit.listeningImage && existsSync(`public${unit.listeningImage.src}`));
      for (const question of unit.questions) {
        if (index >= 2) {
          assert.ok(question.prompt?.trim());
          assert.deepEqual(Object.keys(question.choiceTexts ?? {}), question.choices);
          assert.ok(Object.values(question.choiceTexts!).every(text => text.trim()));
        } else {
          assert.equal(question.choiceTexts, undefined, 'Do not reveal spoken choices during listening');
        }
      }
      const publicUnit = toPublicBookUnit(unit);
      assert.ok(publicUnit.questions.every(q => !('answer' in q)));
    }
  }
});

test('lessons 1–25 retain their existing listening fallback', () => {
  for (const lesson of book.slice(0, 25)) for (const unit of lesson.sections.listening.units) {
    assert.equal(unit.audioSrc, undefined);
    assert.ok(unit.pages.length);
    assert.ok(unit.transcript);
  }
});
