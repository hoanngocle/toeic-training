export type ExerciseTimer = { elapsedMs: number; activeSince: number | null };
export function createExerciseTimer(): ExerciseTimer { return { elapsedMs: 0, activeSince: null }; }
export function exerciseDuration(timer: ExerciseTimer, now = Date.now()): number {
  return Math.min(86400000, Math.max(0, timer.elapsedMs + (timer.activeSince === null ? 0 : Math.max(0, now - timer.activeSince))));
}
export function setTimerActive(timer: ExerciseTimer, active: boolean, now = Date.now()): ExerciseTimer {
  if (active) return timer.activeSince === null ? { ...timer, activeSince: now } : timer;
  return timer.activeSince === null ? timer : { elapsedMs: exerciseDuration(timer, now), activeSince: null };
}
