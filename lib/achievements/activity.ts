import type { DatabaseSync } from 'node:sqlite';
import { activityDay } from './summary.ts';

export function initializeActivity(db: DatabaseSync) {
  db.exec('CREATE TABLE IF NOT EXISTS activity_days (day TEXT PRIMARY KEY)');
}
// Called within the learning save transaction, so failed saves never earn a day.
export function recordActivity(db: DatabaseSync, createdAt: string) {
  db.prepare('INSERT OR IGNORE INTO activity_days(day) VALUES (?)').run(activityDay(new Date(createdAt)));
}
