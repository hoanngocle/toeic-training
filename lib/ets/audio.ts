import { join } from 'node:path';
export function audioPath(test: number, part: number): string | undefined {
  if (!Number.isInteger(test) || test < 1 || test > 10 || !Number.isInteger(part) || part < 0 || part > 4) return undefined;
  const root = join(process.cwd(), 'ETS 2024', 'AUDIO - ETS 2024');
  return part > 0 && test <= 5
    ? join(root, 'AUDIO CẮT TỪNG PART', `PART ${part}`, `PART ${part} - TEST ${test}.mp3`)
    : join(root, 'AUDIO - FULL TEST', `Test_${String(test).padStart(2, '0')}.mp3`);
}
export function parseAudioRange(range: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2]) || size <= 0) return null;
  const first = match[1] ? Number(match[1]) : undefined;
  const last = match[2] ? Number(match[2]) : undefined;
  if ((first !== undefined && !Number.isSafeInteger(first)) || (last !== undefined && !Number.isSafeInteger(last))) return null;
  if (first === undefined) return last && last > 0 ? { start: Math.max(0, size - last), end: size - 1 } : null;
  if (first >= size || (last !== undefined && last < first)) return null;
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}
