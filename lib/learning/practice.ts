export type Direction = 'en-vi' | 'vi-en';
export type Word = { id: number; spokenText: string; meaning: string };
export type Question = { wordId: number; direction: Direction; prompt: string; choices: string[] };

export function normalizeAnswer(text: string) {
  return text.normalize('NFC').toLowerCase().trim().replace(/[.!?。]+$/u, '').replace(/\s+/g, ' ').trim();
}
function listedMeanings(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of text) {
    if (character === '(') depth++;
    if (character === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && /[,;/]/.test(character)) {
      parts.push(current);
      current = '';
    } else current += character;
  }
  parts.push(current);
  return parts.map(normalizeAnswer).filter(Boolean);
}
export function meanings(text: string) {
  return [...new Set(listedMeanings(text).map(part => normalizeAnswer(part.replace(/\([^)]*\)/g, ''))).filter(Boolean))];
}
export function gradeAnswer(word: Word, direction: Direction, answer: string) {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  return direction === 'vi-en'
    ? normalized === normalizeAnswer(word.spokenText)
    : [normalizeAnswer(word.meaning), ...listedMeanings(word.meaning), ...meanings(word.meaning)].includes(normalized);
}
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeQuestions(words: Word[], retryIds?: number[]): Question[] {
  const unique = words.filter((word, index) => words.findIndex(other => normalizeAnswer(other.spokenText) === normalizeAnswer(word.spokenText)) === index);
  const selected = retryIds ? words.filter(word => retryIds.includes(word.id)) : shuffle(unique).slice(0, 20);
  const directions = shuffle(selected.map((_, i): Direction => i % 2 === 0 ? 'en-vi' : 'vi-en'));
  return selected.map((word, i) => {
    const direction = directions[i];
    const label = (entry: Word) => direction === 'en-vi' ? entry.meaning : entry.spokenText;
    const aliases = meanings(word.meaning);
    const candidates = shuffle(words).filter(other => other.id !== word.id &&
      normalizeAnswer(other.spokenText) !== normalizeAnswer(word.spokenText) &&
      !meanings(other.meaning).some(meaning => aliases.includes(meaning)));
    const choices = [label(word)];
    const usedMeanings = new Set(aliases);
    for (const candidate of candidates) {
      const candidateMeanings = meanings(candidate.meaning);
      if (choices.some(choice => normalizeAnswer(choice) === normalizeAnswer(label(candidate))) || candidateMeanings.some(meaning => usedMeanings.has(meaning))) continue;
      choices.push(label(candidate));
      candidateMeanings.forEach(meaning => usedMeanings.add(meaning));
      if (choices.length === 4) break;
    }
    if (choices.length !== 4) throw new Error('Bài này chưa đủ từ khác nghĩa để tạo 4 lựa chọn.');
    return { wordId: word.id, direction, prompt: direction === 'en-vi' ? word.spokenText : word.meaning, choices: shuffle(choices) };
  });
}
