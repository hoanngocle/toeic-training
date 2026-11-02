import type { EtsTest, PublicEtsTest } from './types.ts';
export function toPublicEtsTest(test: EtsTest): PublicEtsTest {
  // Explicit allowlist prevents future private source metadata escaping with a spread.
  return { id: test.id, title: test.title, audioSrc: test.audioSrc, parts: test.parts.map(part => ({
    number: part.number, title: part.title, ...(part.audio ? { audio: { ...part.audio } } : {}),
    groups: part.groups.map(group => ({ id: group.id,
      blocks: group.blocks.map(block => ({ type: block.type, ...(block.text !== undefined ? { text: block.text } : {}), ...(block.src ? { src: block.src } : {}), ...(block.alt ? { alt: block.alt } : {}), ...(block.rows ? { rows: block.rows.map(row => [...row]) } : {}) })),
      questions: group.questions.map(question => ({ number: question.number, prompt: part.number <= 2 ? '' : question.prompt,
        choices: question.choices.map(choice => ({ label: choice.label, text: part.number <= 2 ? '' : choice.text })) })) })) })) };
}
