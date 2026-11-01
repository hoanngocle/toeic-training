import { requireUser } from '../../../lib/auth-server';
import type { Metadata } from "next";
import { lessonSummaries, vocabularyStats } from "../../../components/vocabulary/catalog";
import VocabularyLibrary from "../../../components/vocabulary/vocabulary-library";

export const metadata: Metadata = { title: "Từ vựng | English Space", description: `${vocabularyStats.lessons} bài học với ${vocabularyStats.words} từ, phiên âm và nghĩa tiếng Việt.` };
export default async function VocabularyPage() {
  await requireUser();
  return <VocabularyLibrary lessons={lessonSummaries} />;
}
