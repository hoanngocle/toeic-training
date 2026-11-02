export type Submission = { id: string; testId: number; part: number; answers: Record<string, string>; durationMs: number };
export type Draft = { id: string; startedAt: number; deadline: number | null; answers: Record<string, string>; marked: number[]; pending?: Submission; submitted?: string };
export const draftKey = (userId: string, testId: number, part: number) => `ets-2024:${userId}:${testId}:${part}`;
export function createDraft(id: string, part: number, now: number): Draft {
  return { id, startedAt: now, deadline: part === 0 ? now + 7200000 : null, answers: {}, marked: [] };
}
export function restoreDraft(raw: string | null): Draft | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value.id !== 'string' || !Number.isFinite(value.startedAt) || !(value.deadline === null || Number.isFinite(value.deadline)) || !value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers) || !Object.values(value.answers).every(v => typeof v === 'string') || !Array.isArray(value.marked) || !value.marked.every(Number.isInteger)) return null;
    return value as Draft;
  } catch { return null; }
}
export function submissionPayload(draft: Draft, testId: number, part: number, now: number): Submission {
  return draft.pending ?? { id: draft.id, testId, part, answers: { ...draft.answers }, durationMs: Math.max(0, part === 0 ? Math.min(now - draft.startedAt, 7200000) : now - draft.startedAt) };
}
