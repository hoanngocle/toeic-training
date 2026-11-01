import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLesson, lessonSummaries } from "../../../../components/vocabulary/catalog";
import LessonDetail from "../../../../components/vocabulary/lesson-detail";
import { essentialLessons, getPublicSections } from "../../../../lib/essential/catalog";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return lessonSummaries.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `${lesson.title} · Từ vựng | English Space` : "Không tìm thấy bài" };
}
export default async function LessonPage({ params }: Props) {
  const lesson = getLesson((await params).slug);
  if (!lesson) notFound();
  const navigation = lessonSummaries.filter(item => item.source === lesson.source).map(({ slug, title, count }) => ({ slug, title, count }));
  const bookLesson = lesson.source === "essential" ? essentialLessons.find(item => item.slug === lesson.slug) : undefined;
  const sections = bookLesson ? getPublicSections(bookLesson) : undefined;
  return <LessonDetail key={lesson.slug} lesson={lesson} navigation={navigation} sections={sections}/>;
}
