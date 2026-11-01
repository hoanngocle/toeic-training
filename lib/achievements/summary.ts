import type { Collection } from './collection.ts';
export const ACTIVITY_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const MILESTONES = [1, 10, 50, 100, 250, 500, 1000];

export function activityDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone: ACTIVITY_TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit'}).format(date);
}
export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function summarizeActivity(input: string[], today: string) {
  const days = [...new Set(input)].filter(day => day <= today).sort();
  let longest = 0, run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && shiftDay(days[i - 1], 1) === days[i] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const last = days.at(-1);
  const current = last === today || last === shiftDay(today, -1) ? run : 0;
  return {current, longest, activeDays: days.length};
}
export function calendarDays(month: string): string[] {
  const first = `${month}-01`;
  const date = new Date(`${first}T00:00:00Z`);
  const offset = date.getUTCDay();
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({length: Math.ceil((offset + last) / 7) * 7}, (_, i) => shiftDay(first, i - offset));
}
export type AchievementsData = ReturnType<typeof summarizeActivity> & {
  days: string[]; today: string; totalSessions: number; collection: Collection;
};
