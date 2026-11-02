import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpenIcon, ChatBubbleLeftRightIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { requireUser } from '../../../lib/auth-server';
import { grammarCategories } from '../../../lib/grammar/catalog';

export const metadata: Metadata = { title: 'Ngữ Pháp | English Space' };

export default async function GrammarPage() {
  await requireUser();
  const lessons = grammarCategories.reduce((n, category) => n + category.lessons.length, 0);
  const questions = grammarCategories.reduce((n, category) => n + category.lessons.reduce((n, lesson) => n + lesson.exercises.reduce((n, unit) => n + unit.questions.length, 0), 0), 0);
  return <div className="grammar-page">
    <header className="grammar-hero"><p className="grammar-eyebrow">HỌC QUA NGỮ CẢNH</p><h1>Ngữ Pháp</h1><p>Nắm cấu trúc, hiểu ngữ cảnh.<br />Từng bước làm chủ bài nghe và bài đọc TOEIC.</p>
      <div className="grammar-stats"><span>{grammarCategories.length} hạng mục</span><span>{lessons} bài học</span><span>{questions} câu luyện tập</span></div>
    </header>
    <section aria-labelledby="grammar-categories"><div className="grammar-sectionHeading"><h2 id="grammar-categories">Chọn hạng mục</h2><span>Lý thuyết · Ví dụ · Luyện tập</span></div>
      <div className="grammar-categoryGrid">{grammarCategories.map((category, index) => {
        const Icon = category.slug.startsWith('listening') ? ChatBubbleLeftRightIcon : BookOpenIcon;
        const count = category.lessons.reduce((n, lesson) => n + lesson.exercises.reduce((n, unit) => n + unit.questions.length, 0), 0);
        return <Link className="grammar-categoryCard" key={category.slug} href={`/ngu-phap/${category.slug}`}>
          <div className="grammar-cardTop"><Icon width={26} height={26} aria-hidden="true" /><span>0{index + 1}</span></div>
          <h3 lang="en">{category.title}</h3><p>{category.description}</p>
          <div className="grammar-stats"><span>{category.lessons.length} bài học</span><span>{count ? `${count} câu luyện tập` : 'Lý thuyết & ví dụ'}</span></div>
          <div className="grammar-cardAction">Khám phá bài học <ArrowRightIcon width={18} height={18} aria-hidden="true" /></div>
        </Link>;
      })}</div>
    </section>
  </div>;
}
