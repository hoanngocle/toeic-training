import type { ExerciseResult, PublicBookUnit } from '../../../lib/essential/types';

type Props = {
  unit: PublicBookUnit;
  answers: Record<string, string>;
  questionIds: string[];
  disabled: boolean;
  result?: ExerciseResult | null;
  onAnswer: (id: string, value: string) => void;
};

export default function ContextPassage({ unit, answers, questionIds, disabled, result, onAnswer }: Props) {
  const selectedWords = new Set(Object.values(answers).map(answer => answer.trim().replace(/\s+/g, ' ').toLowerCase()));
  return <div className="essential-context">
    <div className="essential-wordBank" aria-label="Từ gợi ý" lang="en">{unit.wordBank?.map(word => {
      const selected = selectedWords.has(word.trim().replace(/\s+/g, ' ').toLowerCase());
      return <span key={word} className={selected ? 'is-selected' : undefined}>{word}{selected && <span className="essential-srOnly" lang="vi"> (đã chọn)</span>}</span>;
    })}</div>
    <div className="essential-passage" lang="en">{unit.passage?.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph.split(/(\{\{\d+\}\})/g).map((part, partIndex) => {
      const match = part.match(/^\{\{(\d+)\}\}$/);
      if (!match) return part;
      const id = match[1];
      const review = result?.results.find(answer => answer.questionId === id);
      const editable = questionIds.includes(id) && !result;
      return <label key={partIndex} className={`essential-inlineBlank${review ? review.correct ? ' is-correct' : ' is-wrong' : ''}`}>
        <span aria-hidden="true">{id}</span>
        <input aria-label={`Câu ${id}`} type="text" value={answers[id] ?? ''} onChange={event => onAnswer(id, event.target.value)} disabled={disabled} readOnly={!editable} required={editable} tabIndex={editable ? 0 : -1} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={200} />
      </label>;
    })}</p>)}</div>
  </div>;
}
