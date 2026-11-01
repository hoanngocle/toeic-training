import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import type { EssentialLesson } from '../lib/essential/types.ts';
import { toPublicBookUnit } from '../lib/essential/public.ts';
const book = JSON.parse(readFileSync(new URL('../data/essential/book.json', import.meta.url), 'utf8')) as EssentialLesson[];

test('all 50 lessons use original audio and structured listening without exercise scans', () => {
  for (const lesson of book) {
    const source = JSON.parse(readFileSync(new URL(`../data/essential/listening/lesson-${lesson.number}.json`, import.meta.url), 'utf8'));
    if (lesson.number <= 25) {
      const filename = readdirSync('public/audio/600TOEIC').find(name => name.startsWith(`${String(lesson.number).padStart(2, '0')} `) && name.endsWith('.mp3'));
      assert.ok(filename, `Missing original audio for lesson ${lesson.number}`);
      assert.equal(source.audioSrc, `/audio/600TOEIC/${filename}`);
    } else assert.equal(source.audioSrc, `/essential/audio/track-${lesson.number}.mp3`);
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

test('reviewed early Listening corrections preserve complete questions and choices', () => {
  const question = (lesson: number, id: string) => book[lesson - 1].sections.listening.units.flatMap(unit => unit.questions).find(q => q.id === id)!;
  assert.equal(question(3, '9').prompt, 'How can a customer receive money back for a defective product?');
  assert.equal(question(9, '6').prompt, 'What does the man suggest the woman should do?');
  assert.equal(question(24, '7').choiceTexts?.B, 'A government tax agent.');
  assert.equal(question(24, '7').choiceTexts?.C, 'A tax filer.');
});
