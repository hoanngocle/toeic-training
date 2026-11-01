import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { EssentialLesson } from '../lib/essential/types.ts';
import { makeQuestions } from '../lib/learning/practice.ts';
const book=JSON.parse(readFileSync(new URL('../data/essential/book.json',import.meta.url),'utf8')) as EssentialLesson[];

test('book has 50 complete lessons, 600 words, all original section assets and 1940 graded questions',()=>{
  assert.equal(book.length,50);
  const units=new Map();
  for(const [i,lesson] of book.entries()){
    assert.equal(lesson.slug,`essential-${String(i+1).padStart(2,'0')}`);
    assert.equal(lesson.words.length,12);assert.equal(lesson.group,Math.floor(i/5)+1);
    assert.equal(lesson.sections.context.units[0].questions.length,12);
    assert.equal(lesson.sections.reading.units.reduce((n,u)=>n+u.questions.length,0),14);
    assert.equal(lesson.sections.listening.units.reduce((n,u)=>n+u.questions.length,0),9);
    assert.equal(lesson.sections.review.units[0].questions.length,19);
    const pages=[...lesson.vocabularyPages];
    for(const [sectionId,section] of Object.entries(lesson.sections))for(const unit of section.units){
      if(units.has(unit.id))assert.deepEqual(units.get(unit.id),unit,'Shared group review content must agree');
      units.set(unit.id,unit);pages.push(...unit.pages,...unit.transcriptPages??[],...unit.answerKeyPages??[]);
      if(unit.questions.length && sectionId!=='review')assert.ok(unit.answerKeyPages?.length,`Missing original answer keys for ${unit.id}`);
      if(sectionId==='review'){assert.deepEqual(unit.pages,[]);assert.deepEqual(unit.answerKeyPages,[]);}
      assert.equal(new Set(unit.questions.map(q=>q.id)).size,unit.questions.length);
      for(const q of unit.questions){assert.ok(q.answer.trim());if(q.choices)assert.ok(q.choices.includes(q.answer));}
      if(sectionId==='listening'){
        assert.ok(unit.transcript?.trim());assert.ok(unit.transcriptPages?.length);
        if(unit.id.endsWith('-1')||unit.id.endsWith('-2')){
          const choices=[...unit.transcript!.matchAll(/\(([ABCD])\)/g)].map(match=>match[1]);
          assert.deepEqual(choices,[...(unit.id.endsWith('-1')?'ABCD':'ABCABC')],`Missing spoken choices in ${unit.id}`);
          assert.doesNotMatch(unit.transcript!,/\([ABCD]\)\s*(?:\([ABCD]\)|$)/,unit.id);
        }
      }
    }
    for(const page of pages)assert.ok(existsSync(join(process.cwd(),'public',page.src)),`Missing ${page.src}`);
  }
  assert.equal([...units.values()].reduce((n,u)=>n+u.questions.length,0),1940);
  assert.equal(new Set(book.map(l=>l.sections.review.units[0].id)).size,10);
});
test('every 12-word book lesson can produce a balanced, unambiguous vocabulary test',()=>{
  for(const lesson of book){
    const questions=makeQuestions(lesson.words);
    assert.equal(questions.length,12,lesson.slug);
    assert.equal(new Set(questions.map(q=>q.wordId)).size,12);
    assert.equal(questions.filter(q=>q.direction==='en-vi').length,6);
    for(const q of questions)assert.equal(new Set(q.choices).size,4);
  }
});

test('every context passage exposes each graded blank exactly once and a complete word bank',()=>{
  for(const lesson of book){
    const unit=lesson.sections.context.units[0];
    assert.ok(unit.passage,`Missing readable passage: ${lesson.slug}`);
    assert.ok(unit.passage.trim(),lesson.slug);
    assert.deepEqual([...unit.passage.matchAll(/\{\{(\d+)\}\}/g)].map(match=>match[1]),unit.questions.map(q=>q.id),lesson.slug);
    assert.equal(unit.wordBank?.length,12,lesson.slug);
    assert.ok(unit.wordBank?.every(word=>word.trim()),lesson.slug);
  }
});

test('word families include readable forms and examples for every lesson',()=>{
  for(const lesson of book){
    const rows=lesson.sections.families.units[0].wordFamilies;
    assert.ok(rows,`Missing word family table: ${lesson.slug}`);
    assert.ok(rows.length>=16 && rows.length<=18,lesson.slug);
    for(const row of rows){
      assert.ok(['verb','noun','adjective','adverb','gerund'].includes(row.partOfSpeech),lesson.slug);
      assert.ok(row.word.trim(),lesson.slug);
      assert.ok(row.example.trim().length>20,`${lesson.slug}: ${row.word}`);
    }
  }
  const first = book[0].sections.families.units[0].wordFamilies![0];
  assert.deepEqual({partOfSpeech:first.partOfSpeech,word:first.word,example:first.example,translation:first.translation},{
    partOfSpeech:'verb',word:'agree',example:'If both parties agree to the terms, we can finalize the contract.',
    translation:'Nếu cả hai bên đồng ý với các điều khoản, chúng ta có thể hoàn tất hợp đồng.',
  });
});

test('every family form has its own pronunciation and Vietnamese meaning',()=>{
  for(const lesson of book)for(const row of lesson.sections.families.units[0].wordFamilies!){
    assert.match(row.pronunciation ?? '', /^\/[^/]+\/$/, `${lesson.slug}: ${row.word}`);
    assert.ok(row.meaning?.trim(), `${lesson.slug}: ${row.word}`);
    assert.notEqual(row.meaning,row.word);
  }
});

test('every family example has a Vietnamese translation preserved in the import source',()=>{
  const source=JSON.parse(readFileSync(new URL('../data/essential/word-families.json',import.meta.url),'utf8'));
  for(const lesson of book){
    const rows=lesson.sections.families.units[0].wordFamilies!;
    assert.deepEqual(rows,source[lesson.slug],lesson.slug);
    for(const row of rows){
      assert.ok(row.translation?.trim().length>10,`${lesson.slug}: ${row.word}`);
      assert.notEqual(row.translation,row.example);
    }
  }
});
