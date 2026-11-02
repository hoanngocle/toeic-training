import type { BookUnit, ExerciseRequest, ExerciseResult } from './types.ts';

export class ExerciseInputError extends Error {}
const normalize = (value: string) => value.normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ');
const accepted = (key: string) => key.replace(/\s*\(or\s+([^)]*)\)/gi,'/$1').split('/').map(normalize);

export function gradeExercise(input: unknown, unit: BookUnit, scope = unit.questions.map(q=>q.id)): ExerciseResult {
  if (!input || typeof input !== 'object') throw new ExerciseInputError('Dữ liệu lượt làm bài không hợp lệ.');
  const request=input as ExerciseRequest;
  if (typeof request.id!=='string' || !/^[\w-]{10,80}$/.test(request.id) || request.unitId!==unit.id ||
    !Number.isInteger(request.durationMs) || request.durationMs<0 || request.durationMs>86400000 ||
    (request.retryOf!==undefined && (typeof request.retryOf!=='string'||!/^[\w-]{10,80}$/.test(request.retryOf))) ||
    !request.answers || typeof request.answers!=='object' || Array.isArray(request.answers)) throw new ExerciseInputError('Dữ liệu lượt làm bài không hợp lệ.');
  const entries=Object.entries(request.answers);
  if (!entries.length || entries.length!==scope.length || entries.some(([id])=>!scope.includes(id))) throw new ExerciseInputError('Hãy trả lời đủ các câu trong lượt làm bài trước khi nộp.');
  const results=entries.map(([questionId,answer])=>{
    const question=unit.questions.find(q=>q.id===questionId);
    if (!question || typeof answer!=='string' || !answer.trim() || answer.length>300 ||
      (question.choices && !question.choices.some(c=>normalize(c)===normalize(answer)))) throw new ExerciseInputError('Câu trả lời không hợp lệ.');
    const selectedChoice = question.choices?.find(choice => normalize(choice) === normalize(answer));
    return {
      questionId,label:question.label,answer,expected:question.answer,correct:accepted(question.answer).includes(normalize(answer)),
      ...(question.prompt ? { prompt: question.prompt } : {}),
      ...(question.choiceTexts ? { answerText: question.choiceTexts[selectedChoice ?? answer], expectedText: question.choiceTexts[question.answer] } : {}),
      ...(question.explanation ? { explanation: question.explanation } : {}),
      ...(question.sourceNote ? { sourceNote: question.sourceNote } : {}),
    };
  });
  return {id:request.id,unitId:unit.id,durationMs:request.durationMs,createdAt:new Date().toISOString(),score:results.filter(r=>r.correct).length,total:results.length,results,
    ...(unit.passageTranslation ? { passageTranslation: unit.passageTranslation } : {}),
  };
}
