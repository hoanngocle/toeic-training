import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

test('ETS source contains ten complete tests with original Part numbering and choices', () => {
  const tests = JSON.parse(readFileSync(new URL('../data/ets-2024/tests.json', import.meta.url), 'utf8'));
  assert.equal(tests.length, 10);
  const ranges = [[1,6],[7,31],[32,70],[71,100],[101,130],[131,146],[147,200]];
  for (const [index, exam] of tests.entries()) {
    assert.equal(exam.id, index + 1);
    assert.equal(exam.parts.length, 7);
    for (const [i, part] of exam.parts.entries()) {
      assert.equal(part.number, i + 1);
      const questions = part.groups.flatMap((g: {questions: unknown[]}) => g.questions);
      assert.deepEqual(questions.map((q: {number:number}) => q.number), Array.from({length:ranges[i][1]-ranges[i][0]+1},(_,n)=>ranges[i][0]+n));
      for (const q of questions) {
        assert.deepEqual(q.choices.map((c:{label:string})=>c.label), i === 1 ? ['A','B','C'] : ['A','B','C','D']);
        assert.ok(q.choices.some((c:{label:string})=>c.label===q.answer));
        if (i >= 2) assert.ok(q.prompt.trim().length > 5, `Test ${exam.id}, Q${q.number}: missing question`);
        if (i >= 2) assert.ok(q.choices.every((c:{text:string})=>c.text.trim().length > 0), `Test ${exam.id}, Q${q.number}: missing choices`);
      }
      if (i >= 5) assert.ok(part.groups.every((g:{blocks: unknown[]})=>g.blocks.length > 0), `Test ${exam.id}, Part ${part.number}: missing reading passages`);
      for (const group of part.groups) for (const block of group.blocks) if (block.type === 'image') assert.ok(existsSync(path.join(process.cwd(),'public',block.src)), `Missing ${block.src}`);
    }
  }
});

test('ETS native text preserves answer blanks and multi-page reading context', () => {
  const tests = JSON.parse(readFileSync(new URL('../data/ets-2024/tests.json', import.meta.url), 'utf8'));
  for (const exam of tests) {
    for (const group of exam.parts[4].groups) for (const q of group.questions) {
      assert.match(q.prompt, /_{4,}/, `Test ${exam.id}, Q${q.number}: source blank lost`);
    }
    for (const group of exam.parts[5].groups) {
      const text = group.blocks.map((b: {text?:string})=>b.text ?? '').join('\n');
      const labels = [...text.matchAll(/\((1[34]\d)\)\s*_{4,}/g)].map(m=>Number(m[1]));
      assert.deepEqual(labels, group.questions.map((q:{number:number})=>q.number), `Test ${exam.id}: Part 6 blanks`);
    }
    // Three document sets continue on their question page; keep that text too.
    for (const first of [186,191,196]) {
      const group = exam.parts[6].groups.find((g:{questions:{number:number}[]})=>g.questions[0].number===first);
      assert.ok(group.blocks.length >= 2, `Test ${exam.id}, Q${first}: missing continuation document`);
    }
    for (const part of exam.parts.slice(0,4)) {
      assert.ok(part.audio.src);
      if (exam.id >= 6) assert.ok(part.audio.start >= 0 && part.audio.end > part.audio.start);
    }
  }
});

test('ETS answer keys follow the printed Test label rather than PDF object order', () => {
  const tests = JSON.parse(readFileSync(new URL('../data/ets-2024/tests.json', import.meta.url), 'utf8'));
  const questions = tests[7].parts.flatMap((p:{groups:{questions:{number:number;answer:string}[]}[]})=>p.groups.flatMap(g=>g.questions));
  assert.equal(questions.find((q:{number:number})=>q.number===151)?.answer, 'B');
  assert.equal(questions.find((q:{number:number})=>q.number===152)?.answer, 'C');
  const rc = [['B','B'],['C','B'],['C','D'],['A','D'],['D','A'],['B','B'],['A','C'],['A','D'],['B','A'],['B','B']];
  const lc = [['A','D'],['A','B'],['D','D'],['C','C'],['D','D'],['B','D'],['D','B'],['D','C'],['C','D'],['D','D']];
  for (const [i, exam] of tests.entries()) {
    const all = exam.parts.flatMap((p:{groups:{questions:{number:number;answer:string}[]}[]})=>p.groups.flatMap(g=>g.questions));
    const key = (number:number) => all.find((q:{number:number})=>q.number===number)?.answer;
    assert.deepEqual([key(1),key(100)],lc[i],`LC printed Test ${i+1}`);
    assert.deepEqual([key(101),key(200)],rc[i],`RC printed Test ${i+1}`);
  }
});

test('test-book end instructions never appear inside question alternatives', () => {
  const tests = JSON.parse(readFileSync(new URL('../data/ets-2024/tests.json', import.meta.url), 'utf8'));
  for (const exam of tests) for (const part of exam.parts) for (const group of part.groups) for (const q of group.questions) for (const choice of q.choices) {
    assert.doesNotMatch(choice.text, /Stop!|finish before time is called|check your work|GO ON TO THE NEXT PAGE/i, `Test ${exam.id} Q${q.number}`);
  }
});

test('all sentence insertion questions retain the four original target positions', () => {
  const tests = JSON.parse(readFileSync(new URL('../data/ets-2024/tests.json', import.meta.url), 'utf8'));
  let count = 0;
  for (const exam of tests) for (const group of exam.parts[6].groups) {
    if (!group.questions.some((q:{prompt:string})=>q.prompt.includes('positions marked'))) continue;
    count++;
    const passage = group.blocks.map((b:{text?:string})=>b.text ?? '').join('\n');
    for (const position of [1,2,3,4]) assert.ok(passage.includes(`[${position}]`), `Test ${exam.id}, ${group.id}: position ${position} missing`);
  }
  assert.equal(count, 20);
});

test('Listening text questions retain complete source question endings', () => {
  const tests = JSON.parse(readFileSync(new URL('../data/ets-2024/tests.json', import.meta.url), 'utf8'));
  for (const exam of tests) for (const part of exam.parts.slice(2,4)) for (const group of part.groups) for (const question of group.questions) {
    assert.ok(question.prompt.endsWith('?'), `Test ${exam.id}, Q${question.number}: incomplete prompt`);
  }
});

test('native tables preserve source values and article columns keep reading order', () => {
  const tests = JSON.parse(readFileSync(new URL('../data/ets-2024/tests.json', import.meta.url), 'utf8'));
  const group = (id:number, first:number) => tests[id-1].parts[6].groups.find((g:{questions:{number:number}[]})=>g.questions[0].number===first);
  const rows = (id:number,first:number) => group(id,first).blocks.flatMap((b:{rows?:string[][]})=>b.rows ?? []);
  assert.ok(rows(2,176).some((row:string[])=>JSON.stringify(row)===JSON.stringify(['Mango','3','3','2','1'])));
  assert.ok(rows(2,176).some((row:string[])=>JSON.stringify(row)===JSON.stringify(['Salted Caramel','2','1','1','5'])));
  assert.ok(rows(7,191).some((row:string[])=>JSON.stringify(row)===JSON.stringify(['Sunday','10 A.M.–4 P.M.'])));
  const article = group(2,151).blocks.map((b:{text?:string})=>b.text ?? '').join('\n');
  assert.ok(article.indexOf('Dade location will become its new base') > article.indexOf('DADE'), 'second article column must follow the first column');
});
