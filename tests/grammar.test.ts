import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradeExercise } from '../lib/essential/grading.ts';
import { toPublicBookUnit } from '../lib/essential/public.ts';
import type { BookUnit } from '../lib/essential/types.ts';
import { calculateEssentialReward } from '../lib/progression/reward.ts';
import { database, alice } from './helpers/progression-db.ts';

type Block = { type: string; text?: string; rows?: string[][]; sourcePage: number };
type Lesson = { slug: string; title: string; blocks: Block[]; exercises: BookUnit[] };
type Category = { slug: string; source: { file: string; pages: number }; lessons: Lesson[] };
const load = () => JSON.parse(readFileSync(new URL('../data/grammar/book.json', import.meta.url), 'utf8')) as Category[];

test('all nine source documents are converted, with complete page coverage and native blocks', () => {
  const categories = load();
  assert.deepEqual(categories.map(c => c.slug), ['listening-part-2', 'listening-part-3', 'reading-part-6', 'reading-part-7', 'tinh-tu', 'gioi-tu-lien-tu-menh-de', 'danh-tu', 'trat-tu-tu', 'dong-tu']);
  assert.equal(categories.reduce((n, c) => n + c.source.pages, 0), 115);
  const slugs = new Set<string>();
  for (const category of categories) {
    const covered = new Set<number>();
    assert.ok(category.lessons.length >= 3);
    for (const lesson of category.lessons) {
      assert.ok(!slugs.has(lesson.slug)); slugs.add(lesson.slug);
      assert.ok(lesson.blocks.length && lesson.title.trim());
      for (const block of lesson.blocks) {
        assert.ok(['heading', 'paragraph', 'list', 'table', 'note'].includes(block.type));
        assert.ok(block.text?.trim() || block.rows?.length);
        assert.ok(block.sourcePage >= 1 && block.sourcePage <= category.source.pages);
        covered.add(block.sourcePage);
      }
    }
    assert.equal(covered.size, category.source.pages, category.slug);
  }
});

test('converted examples have verified answers, can be graded and do not ship solutions in public questions', () => {
  const categories = load();
  const ids = new Set<string>();
  const units = categories.flatMap(c => c.lessons.flatMap(l => l.exercises));
  assert.ok(units.length >= 15);
  for (const unit of units) {
    assert.ok(!ids.has(unit.id)); ids.add(unit.id);
    assert.deepEqual(unit.pages, []);
    assert.ok(unit.questions.length);
    for (const q of unit.questions) {
      assert.ok(q.prompt?.trim()); assert.ok(q.explanation?.trim());
      assert.ok(q.choices?.includes(q.answer) || !q.choices);
      if (q.choices) assert.deepEqual(Object.keys(q.choiceTexts ?? {}), q.choices);
    }
    const answers = Object.fromEntries(unit.questions.map(q => [q.id, q.answer.split('/')[0]]));
    const result = gradeExercise({ id: 'grammar-test-attempt', unitId: unit.id, durationMs: 5000, answers }, unit);
    assert.equal(result.score, unit.questions.length);
    for (const q of toPublicBookUnit(unit).questions) {
      assert.ok(!('answer' in q)); assert.ok(!('explanation' in q));
    }
    assert.ok(!unit.transcript || !/=>|Chọn \([ABCD]\)/.test(unit.transcript));
  }
});

test('foundation practice accepts original alternative forms and straight or curly apostrophes', () => {
  const units = load().slice(4).flatMap(c => c.lessons.flatMap(l => l.exercises));
  const alternatives = units.flatMap(unit => unit.questions.filter(q => q.answer.includes('/')).map(question => ({ unit, question })));
  assert.ok(alternatives.some(({ question }) => question.answer === 'mosquitoes/mosquitos'));
  assert.ok(alternatives.some(({ question }) => question.answer.includes('kid’s')));
  for (const { unit, question } of alternatives) {
    for (const answer of question.answer.split('/')) {
      const answers = Object.fromEntries(unit.questions.map(q => [q.id, q.id === question.id ? answer : q.answer.split('/')[0]]));
      const result = gradeExercise({ id: 'grammar-alias-attempt', unitId: unit.id, durationMs: 1000, answers }, unit);
      assert.equal(result.score, result.total, `${unit.id}: ${answer}`);
    }
  }
});

test('source illustration data is rebuilt as readable native tables', () => {
  const category = load().find(c => c.slug === 'listening-part-3')!;
  const tables = category.lessons.flatMap(l => l.blocks).filter(b => b.type === 'table');
  assert.ok(tables.some(b => JSON.stringify(b.rows).includes('$10,200')));
  assert.ok(tables.some(b => JSON.stringify(b.rows).includes('Tomas')));
});

test('foundation tables retain their column relationships and underlined verb examples stay readable', () => {
  const categories = load();
  const clauses = categories.find(c => c.slug === 'gioi-tu-lien-tu-menh-de')!;
  const rows = clauses.lessons.flatMap(l => l.blocks).flatMap(b => b.rows ?? []);
  assert.ok(rows.some(row => row[0] === 'because of' && row[1] === 'because'));
  assert.ok(rows.some(row => row[0] === 'in spite of' && row[1] === 'mặc dù'));
  assert.ok(rows.some(row => row[0] === 'subject to' && row[1] === 'phụ thuộc vào'));
  assert.ok(rows.some(row => row[0] === 'as well as' && row[1] === 'cũng như'));
  assert.ok(rows.some(row => row[0] === 'who' && row[1] === 'Người' && row[2] === 'Chủ ngữ'));
  const verbs = categories.find(c => c.slug === 'dong-tu')!;
  const verbBlocks = verbs.lessons.flatMap(l => l.blocks);
  assert.ok(verbBlocks.some(b => b.rows?.some(row => row[0] === 'can' && row[1] === 'could')));
  const seventhPage = verbBlocks.filter(b => b.sourcePage === 7);
  assert.ok(seventhPage.every(b => b.type !== 'table'));
  assert.match(seventhPage.map(b => b.text ?? '').join(' '), /advise\s*\/\s*allow/);
  const adjectiveTables = categories.find(c => c.slug === 'tinh-tu')!.lessons.flatMap(l => l.blocks).filter(b => b.type === 'table');
  assert.ok(adjectiveTables.every(b => b.rows!.every(row => row.length <= 4)));
});

test('every source page passes the importer character-coverage audit', () => {
  const audit = JSON.parse(readFileSync(new URL('../data/grammar/conversion-audit.json', import.meta.url), 'utf8')) as { category: string; page: number; missingCharacters: number }[];
  assert.equal(audit.length, 115);
  assert.equal(new Set(audit.map(page => `${page.category}/${page.page}`)).size, 115);
  assert.ok(audit.every(page => page.missingCharacters === 0));
});

test('the five foundation categories have source-based inline practice and preserve previous TOEIC questions', () => {
  const categories = load();
  const previous = categories.slice(0, 4).flatMap(c => c.lessons.flatMap(l => l.exercises));
  assert.equal(previous.length, 28);
  for (const slug of ['tinh-tu', 'gioi-tu-lien-tu-menh-de', 'danh-tu', 'trat-tu-tu', 'dong-tu']) {
    const category = categories.find(c => c.slug === slug)!;
    assert.ok(category, slug);
    const units = category.lessons.flatMap(l => l.exercises);
    assert.ok(units.length, `${slug} needs practice from its complete examples`);
    for (const unit of units) {
      assert.ok(unit.passage, unit.id);
      assert.deepEqual([...unit.passage.matchAll(/\{\{(\d+)\}\}/g)].map(match => match[1]), unit.questions.map(q => q.id));
      for (const question of unit.questions) {
        assert.ok(question.sourceNote?.includes(category.source.file), `${unit.id} must identify its source`);
      }
    }
  }
});

test('grammar attempts and wrong-answer retries persist through the current database workflow', async () => {
  const unit = load()[0].lessons[0].exercises[0];
  const db = await database();
  try {
    const request = { id: 'grammar-db-parent', unitId: unit.id, durationMs: 1000, answers: { '1': 'B' } };
    const result = gradeExercise(request, unit);
    const persist = async (req: typeof request & { retryOf?: string }) => {
      const result = gradeExercise(req, unit);
      return (await db.query<{ result: { score: number } }>('SELECT public.save_exercise($1,$2::jsonb,$3::jsonb) AS result', [alice, JSON.stringify(req), JSON.stringify({ ...result, rewardCalculation: calculateEssentialReward(result) })])).rows[0].result;
    };
    assert.equal(result.score, 0);
    assert.equal((await persist(request)).score, 0);
    const retry = { ...request, id: 'grammar-db-retry', retryOf: request.id, answers: { '1': 'A' } };
    assert.equal((await persist(retry)).score, 1);
    await persist(retry);
    const history = await db.query('SELECT id FROM public.essential_sessions WHERE user_id=$1 AND unit=$2', [alice, unit.id]);
    assert.equal(history.rows.length, 2);
  } finally { await db.close(); }
});
