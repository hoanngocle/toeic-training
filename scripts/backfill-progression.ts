import { createClient } from '@supabase/supabase-js';
import { backfillCloudProgression } from '../lib/progression/backfill.ts';
const [userId,...flags]=process.argv.slice(2);
if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || flags.some(flag=>flag!=='--apply')) {
  console.error('Usage: node --env-file=.env.local scripts/backfill-progression.ts <user-uuid> [--apply]');
  process.exitCode=1;
} else {
  try {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
    if(!url||!key)throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const dryRun=!flags.includes('--apply');
    const stats=await backfillCloudProgression(client,userId,{dryRun});
    console.log(dryRun?'Dry run: no data changed.':'Backfill completed.',stats);
  } catch(error){console.error(error instanceof Error?error.message:'Backfill failed');process.exitCode=1;}
}
