import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { legacySnapshot, snapshotFingerprint } from '../lib/supabase/legacy.ts';
test('legacy snapshot tolerates missing tables and produces stable fingerprint',()=>{
 const db=new DatabaseSync(':memory:');
 try {
  const empty=legacySnapshot(db);
  assert.deepEqual(empty,{sessions:[],progress:[],essential_sessions:[],activity_days:[],achievement_awards:[]});
  db.exec("CREATE TABLE activity_days(day TEXT PRIMARY KEY); INSERT INTO activity_days VALUES('2026-11-01');");
  const snapshot=legacySnapshot(db);
  assert.deepEqual(snapshot.activity_days,[{day:'2026-11-01'}]);
  assert.equal(snapshotFingerprint(snapshot),snapshotFingerprint(legacySnapshot(db)));
  assert.notEqual(snapshotFingerprint(empty),snapshotFingerprint(snapshot));
 }finally{db.close();}
});
