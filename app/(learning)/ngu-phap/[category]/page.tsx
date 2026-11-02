import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { requireUser } from '../../../../lib/auth-server';
import { getGrammarCategory, grammarLessonHref } from '../../../../lib/grammar/catalog';

type Props = { params: Promise<{ category: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getGrammarCategory((await params).category);
  return { title: `${category?.title ?? 'Không tìm thấy bài'} · Ngữ Pháp | English Space` };
}

export default async function GrammarCategoryPage({ params }: Props) {
  await requireUser();
  const category = getGrammarCategory((await params).category);
  if (!category) notFound();
  return <div className="grammar-page">
    <Link className="grammar-back" href="/ngu-phap">← Tất cả hạng mục</Link>
    <header className="grammar-hero"><p className="grammar-eyebrow">NGỮ PHÁP · {category.lessons.length} BÀI HỌC</p><h1 lang="en">{category.title}</h1><p>{category.description}</p></header>
    <ol className="grammar-lessonList">{category.lessons.map((lesson, index) => {
      const count = lesson.exercises.reduce((n, unit) => n + unit.questions.length, 0);
      return <li key={lesson.slug}><Link href={grammarLessonHref(category.slug, lesson)}><span className="grammar-lessonNumber">{String(index + 1).padStart(2, '0')}</span><div><h2>{lesson.title}</h2><p>Lý thuyết & ví dụ{count ? ` · ${count} câu luyện tập` : ''}</p></div><ArrowRightIcon width={20} height={20} aria-hidden="true" /></Link></li>;
    })}</ol>
  </div>;
}
