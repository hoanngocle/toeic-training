import type { EtsTest, EtsResult, EtsRequest } from './types.ts';
export class EtsInputError extends Error {}
export function validateEtsScope(test: EtsTest, part: unknown): asserts part is number {
  if (!Number.isInteger(part) || (part !== 0 && !test.parts.some(p => p.number === part))) throw new EtsInputError('Part không hợp lệ.');
}
export function gradeEts(input: unknown, test: EtsTest): EtsResult {
  if (!input || typeof input !== 'object') throw new EtsInputError('Dữ liệu không hợp lệ.');
  const value = input as EtsRequest;
  if (typeof value.id !== 'string' || !/^[\w-]{10,80}$/.test(value.id) || value.testId !== test.id) throw new EtsInputError('Đề hoặc mã lượt làm không hợp lệ.');
  validateEtsScope(test, value.part);
  if (!Number.isSafeInteger(value.durationMs) || value.durationMs < 0 || (value.part === 0 && value.durationMs > 120 * 60 * 1000)) throw new EtsInputError('Thời gian làm bài không hợp lệ.');
  if (!value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers)) throw new EtsInputError('Câu trả lời không hợp lệ.');
  const parts = test.parts.filter(part => value.part === 0 || part.number === value.part);
  const groups = parts.flatMap(part => part.groups);
  const questions = groups.flatMap(group => group.questions);
  const byNumber = new Map(questions.map(question => [String(question.number), question]));
  for (const [number, selected] of Object.entries(value.answers)) {
    const question = byNumber.get(number);
    if (!question || typeof selected !== 'string' || (selected !== '' && !question.choices.some(choice => choice.label === selected))) throw new EtsInputError('Câu hỏi hoặc lựa chọn không hợp lệ.');
  }
  const results = questions.map(question => {
    const selected = Object.hasOwn(value.answers, String(question.number)) ? value.answers[String(question.number)] : '';
    return { number: question.number, selected, expected: question.answer, correct: selected !== '' && selected === question.answer };
  });
  return { id: value.id, testId: test.id, part: value.part, durationMs: value.durationMs, createdAt: new Date().toISOString(), score: results.filter(result => result.correct).length, total: results.length, results,
    transcripts: Object.fromEntries(groups.filter(group => group.transcript).map(group => [group.id, group.transcript!])) };
}
