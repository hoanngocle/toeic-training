import type { BookUnit, PublicBookUnit } from './types.ts';

// Explicitly allow public question fields: solutions are returned only by grading.
export function toPublicBookUnit(unit: BookUnit): PublicBookUnit {
  return {
    ...unit,
    questions: unit.questions.map(q => ({
      id: q.id, label: q.label,
      ...(q.choices ? { choices: q.choices } : {}),
      ...(q.prompt ? { prompt: q.prompt } : {}),
      ...(q.choiceTexts ? { choiceTexts: q.choiceTexts } : {}),
    })),
  };
}
