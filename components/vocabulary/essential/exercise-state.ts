import type { ExerciseRequest, ExerciseResult } from '../../../lib/essential/types';
export type ExerciseState = { answers: Record<string, string>; questionIds: string[] | null; retryOf?: string; pending: ExerciseRequest | null; result: ExerciseResult | null; saving: boolean; error: string };
export type ExerciseAction = { type: 'answer'; id: string; value: string } | { type: 'submit'; payload: ExerciseRequest } | { type: 'failure'; error: string } | { type: 'success'; result: ExerciseResult } | { type: 'restart'; ids?: string[] };
export function initialExercise(): ExerciseState { return { answers: {}, questionIds: null, pending: null, result: null, saving: false, error: '' }; }
export function exerciseReducer(state: ExerciseState, action: ExerciseAction): ExerciseState {
  switch (action.type) {
    case 'answer':
      return state.pending || state.result ? state : { ...state, answers: { ...state.answers, [action.id]: action.value } };
    case 'submit':
      return { ...state, pending: state.pending ?? action.payload, saving: true, error: '' };
    case 'failure':
      return { ...state, saving: false, error: action.error };
    case 'success':
      return { ...state, pending: null, saving: false, error: '', result: action.result };
    case 'restart':
      return state.pending ? state : { ...initialExercise(), questionIds: action.ids ?? null, retryOf: action.ids ? state.result?.id : undefined };
  }
}
