import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@supabase/supabase-js';
import { legacySnapshot,snapshotFingerprint } from '../lib/supabase/legacy.ts';
const args=process.argv.slice(2);
const file=args[0],target=args[1];
if (!file || !target || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target) || args.slice(2).some(arg=>arg!=='--apply')) {
  console.error('Usage: node --env-file=.env.local scripts/import-learning.ts <sqlite-path> <admin-user-uuid> [--apply]');process.exitCode=1;
} else {
  let db:DatabaseSync|undefined;
  try {
    db=new DatabaseSync(file,{readOnly:true});
    const snapshot=legacySnapshot(db);
    db.close();db=undefined;
    console.log('Rows:',Object.fromEntries(Object.entries(snapshot).map(([table,rows])=>[table,rows.length])));
    if(!args.includes('--apply')) console.log('Dry run: no cloud data changed. Use --apply to import into the specified admin account.');
    else {
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
      if(!url||!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.');
      const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data,error}=await client.rpc('import_legacy_learning',{p_user_id:target,p_snapshot:snapshot,p_fingerprint:snapshotFingerprint(snapshot)});
      if(error) throw new Error(error.message.includes('IMPORT_CONFLICT')?'Import conflict: target has data or another snapshot was imported. Nothing overwritten.':error.message.includes('ADMIN_TARGET_REQUIRED')?'Target must be an active admin account.':'Import failed. Check migrations, connection and source schema.');
      console.log(data?.alreadyImported?'This exact snapshot was already imported. No changes.':'Import completed. Source SQLite unchanged.');
    }
  } catch(error) {console.error(error instanceof Error?error.message:'Import failed.');process.exitCode=1;}
  finally {db?.close();}
}
