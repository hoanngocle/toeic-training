import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
type Row=Record<string,unknown>;
export type LegacySnapshot={sessions:Row[];progress:Row[];essential_sessions:Row[];activity_days:Row[];achievement_awards:Row[]};
export function legacySnapshot(db:DatabaseSync):LegacySnapshot {
  const snapshot:LegacySnapshot={sessions:[],progress:[],essential_sessions:[],activity_days:[],achievement_awards:[]};
  db.exec('BEGIN');
  try {
    for (const table of Object.keys(snapshot) as (keyof LegacySnapshot)[]) {
      if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) continue;
      const history=table==='sessions'||table==='essential_sessions';
      const order=history?'created_at,rowid':table==='progress'?'lesson,word_id':table==='activity_days'?'day':'id';
      snapshot[table]=db.prepare(`SELECT ${history?'rowid AS sequence,':''} * FROM ${table} ORDER BY ${order}`).all().map(row=>{
        const value:Row={...row};
        if(history){value.request=JSON.parse(String(row.request));value.result=JSON.parse(String(row.result));}
        return value;
      });
    }
    db.exec('COMMIT');return snapshot;
  } catch(error) {db.exec('ROLLBACK');throw error;}
}
export function snapshotFingerprint(snapshot:LegacySnapshot) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}
