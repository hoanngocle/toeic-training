import { readCloudProgression } from '../../../lib/progression/cloud';
import { lessonTestSize } from '../../../lib/achievements/catalog';
import { requireUser } from '../../../lib/auth-server';
import { readCloudAchievements } from '../../../lib/supabase/learning';
import { adminClient } from '../../../lib/supabase/admin';
import { userClient } from '../../../lib/supabase/server';
import Achievements from '../../../components/achievements/achievements';

export const metadata = {title: 'Thành tích | English Space'};

export default async function AchievementsPage() {
  const user = await requireUser();
  const progression = await readCloudProgression(await userClient(), user.id);
  const data = await readCloudAchievements(await userClient(), user.id, new Date(), lessonTestSize);
  const {error} = await adminClient().rpc('record_awards', {p_user_id:user.id,p_awards:data.collection.awards});
  if(error) throw new Error('Chưa lưu được thành tích. Vui lòng thử lại.');
  return <Achievements key={data.today} data={data} progression={progression}/>;
}
