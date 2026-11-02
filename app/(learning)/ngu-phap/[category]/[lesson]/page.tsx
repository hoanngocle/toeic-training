import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '../../../../../lib/auth-server';
import { getGrammarCategory, getGrammarLesson, grammarLessonHref } from '../../../../../lib/grammar/catalog';
import { toPublicBookUnit } from '../../../../../lib/essential/public';
import GrammarTheory from '../../../../../components/grammar/theory';
import GrammarWorkspace from '../../../../../components/grammar/lesson-workspace';

type Props = { params: Promise<{ category: string; lesson: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, lesson } = await params;
  const item = getGrammarLesson(category, lesson);
  return { title: `${item?.title ?? 'Không tìm thấy bài'} · Ngữ Pháp | English Space` };
}

export default async function GrammarLessonPage({ params }: Props) {
  await requireUser();
  const { category: categorySlug, lesson: lessonSlug } = await params;
  const category = getGrammarCategory(categorySlug);
  const lesson = getGrammarLesson(categorySlug, lessonSlug);
  if (!category || !lesson) notFound();
  const index = category.lessons.indexOf(lesson);
  const previous = category.lessons[index - 1];
  const next = category.lessons[index + 1];
  return <div className="grammar-page grammar-detail">
    <Link className="grammar-back" href={`/ngu-phap/${category.slug}`}>← {category.title}</Link>
    <div className="grammar-detailGrid">
      <aside className="grammar-lessonNav"><details open><summary>{category.title} · {category.lessons.length} bài</summary><nav aria-label="Danh sách bài học">{category.lessons.map((item, i) => <Link key={item.slug} href={grammarLessonHref(category.slug, item)} aria-current={item.slug === lesson.slug ? 'page' : undefined}><span>{String(i + 1).padStart(2, '0')}</span>{item.title}</Link>)}</nav></details></aside>
      <div className="grammar-lessonBody"><header className="grammar-lessonHeader"><p className="grammar-eyebrow">BÀI {String(index + 1).padStart(2, '0')} / {category.lessons.length}</p><h1>{lesson.title}</h1><p>Đọc để hiểu, luyện để nhớ.</p></header>
        <GrammarWorkspace key={lesson.slug} exercises={lesson.exercises.map(toPublicBookUnit)} theory={<GrammarTheory blocks={lesson.blocks} />} />
        <nav className="grammar-pagination" aria-label="Chuyển bài học">{previous ? <Link href={grammarLessonHref(category.slug, previous)}>← Bài trước<span>{previous.title}</span></Link> : <span />}{next ? <Link href={grammarLessonHref(category.slug, next)}>Bài tiếp theo →<span>{next.title}</span></Link> : <Link href={`/ngu-phap/${category.slug}`}>Về danh sách bài →</Link>}</nav>
      </div>
    </div>
  </div>;
}
