import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EtsTest, EtsTestSummary } from './types.ts';
import { toPublicEtsTest } from './public.ts';

function readCatalog(): EtsTest[] {
  try { return JSON.parse(readFileSync(join(process.cwd(), 'data/ets-2024/tests.json'), 'utf8')) as EtsTest[]; }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}
export function getEtsTest(id: number) { return readCatalog().find(test => test.id === id); }
export function getPublicEtsTest(id: number) { const test = getEtsTest(id); return test ? toPublicEtsTest(test) : undefined; }
export function listEtsTests(): EtsTestSummary[] {
  return readCatalog().map(test => ({ id: test.id, title: test.title, total: test.parts.reduce((n, part) => n + part.groups.reduce((count, group) => count + group.questions.length, 0), 0),
    parts: test.parts.map(part => ({ number: part.number, title: part.title, total: part.groups.reduce((n, group) => n + group.questions.length, 0) })) }));
}
