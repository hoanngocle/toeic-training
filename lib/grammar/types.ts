import type { BookUnit } from '../essential/types';

export type GrammarBlock = {
  sourcePage: number;
} & ({ type: 'heading' | 'paragraph' | 'list' | 'note'; text: string } | { type: 'table'; rows: string[][]; hasHeader?: boolean });

export type GrammarLesson = { slug: string; title: string; blocks: GrammarBlock[]; exercises: BookUnit[] };
export type GrammarCategory = {
  slug: string; title: string; description: string;
  source: { file: string; pages: number };
  lessons: GrammarLesson[];
};
