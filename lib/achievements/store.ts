import { buildCollection } from './collection.ts';
import type { AchievementEvent } from './collection.ts';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initializeActivity } from './activity.ts';
import { activityDay, summarizeActivity } from './summary.ts';
import type { AchievementsData } from './summary.ts';

export function readAchievements(path: string, now = new Date(), testSize: (lesson: string) => number = () => 20): AchievementsData {
  if (path !== ':memory:') mkdirSync(dirname(path), {recursive:true});
  const db = new DatabaseSync(path);
  try {
    db.exec('PRAGMA busy_timeout = 5000');
    initializeActivity(db);
    db.exec('CREATE TABLE IF NOT EXISTS achievement_awards (id TEXT PRIMARY KEY, earned_day TEXT NOT NULL)');
    db.exec('BEGIN IMMEDIATE');
    const events: AchievementEvent[] = [];
    let totalSessions = 0;
    for (const table of ['sessions', 'essential_sessions']) {
      if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) continue;
      // Vietnam is UTC+7 with no daylight-saving changes. Import all historical
      // sessions, including flashcards and incorrect answers, idempotently.
      db.exec(`INSERT OR IGNORE INTO activity_days(day) SELECT DISTINCT date(created_at, '+7 hours') FROM ${table} WHERE date(created_at, '+7 hours') IS NOT NULL`);
      for (const row of db.prepare(`SELECT rowid AS sequence, * FROM ${table} ORDER BY created_at, rowid`).all()) {
        const result = JSON.parse(String(row.result));
        const request = JSON.parse(String(row.request));
        const vocabulary = table === 'sessions';
        const lesson = vocabulary ? String(row.lesson) : String(row.unit).match(/^essential-\d{2}/)?.[0] ?? String(row.unit);
        const fullTest = vocabulary
          ? result.fullTest ?? (row.mode === 'test' && !request.retryOf && result.total === testSize(lesson))
          : !request.retryOf;
        events.push({id:`${table}:${String(row.sequence).padStart(12,'0')}`, at:String(row.created_at), lesson,
          mode:vocabulary?String(row.mode):undefined, fullTest,
          test:vocabulary?`vocab:${lesson}`:`exercise:${row.unit}`,
          perfect:result.total>0 && result.score===result.total,
          answers:vocabulary?result.results:[]});
      }
      totalSessions += Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count ?? 0);
    }
    const days = db.prepare('SELECT day FROM activity_days ORDER BY day').all().map(row => String(row.day));
    const collection = buildCollection(events, days);
    for (const [id, day] of Object.entries(collection.awards)) {
      db.prepare('INSERT INTO achievement_awards(id, earned_day) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET earned_day = MIN(earned_day, excluded.earned_day)').run(id, day);
    }
    for (const row of db.prepare('SELECT id, earned_day FROM achievement_awards').all()) collection.awards[String(row.id)] = String(row.earned_day);
    db.exec('COMMIT');
    const today = activityDay(now);
    return {...summarizeActivity(days, today), days, today, totalSessions, collection};
  } finally { db.close(); }
}
