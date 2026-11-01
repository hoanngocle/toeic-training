import { requireUser } from "../../lib/auth-server";
import LearningHome from "../../components/home/learning-home";

import { vocabularyStats } from "../../components/vocabulary/catalog";

export default async function Home() {
  await requireUser();
  return <LearningHome vocabularyStats={vocabularyStats} />;
}
