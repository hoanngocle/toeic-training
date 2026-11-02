import { requireUser } from '../../../lib/auth-server';
import type { Metadata } from "next";
import { getLesson, lessonSummaries, vocabularyStats } from "../../../components/vocabulary/catalog";
import VocabularyLibrary from "../../../components/vocabulary/vocabulary-library";
import { userClient } from '../../../lib/supabase/server';
import { readLearnedWords } from '../../../lib/supabase/learning';
import { lessonCompletion } from '../../../lib/learning/completion';

export const metadata: Metadata = { title: "Từ vựng | English Space", description: `${vocabularyStats.lessons} bài học với ${vocabularyStats.words} từ, phiên âm và nghĩa tiếng Việt.` };
export default async function VocabularyPage() {
  const user = await requireUser();
  const learnedWords = await readLearnedWords(await userClient(), user.id);
  const completion = Object.fromEntries(lessonSummaries.map(lesson => [lesson.slug,
    lessonCompletion(getLesson(lesson.slug)!.words, learnedWords[lesson.slug] ?? []),
  ]));
  return <VocabularyLibrary lessons={lessonSummaries} completion={completion} />;
}
