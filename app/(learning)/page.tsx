import { userClient } from '../../lib/supabase/server';
import { readCloudProgression } from '../../lib/progression/cloud';
import { requireUser } from "../../lib/auth-server";
import LearningHome from "../../components/home/learning-home";

import { vocabularyStats } from "../../components/vocabulary/catalog";

export default async function Home() {
  const user = await requireUser();
  const progression = await readCloudProgression(await userClient(), user.id);
  return <LearningHome vocabularyStats={vocabularyStats} progression={progression} />;
}
