"use client";

import { useId, useState } from 'react';
import { ChatBubbleLeftEllipsisIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { WordFamilyRow } from '../../../lib/essential/types';
import PronounceButton from '../pronounce-button';
import WordExample from '../word-example';
import { normalizeSearch } from '../search';

export default function WordFamilies({ rows }: { rows: WordFamilyRow[] }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const id = useId();
  const words = rows.map((row, index) => ({ ...row, index })).filter(row => normalizeSearch(`${row.word} ${row.partOfSpeech} ${row.meaning}`).includes(normalizeSearch(query)));
  function toggle(index: number) {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }
  return <section className="vocab-wordSection" aria-labelledby={`${id}-heading`}>
    <div className="vocab-wordToolbar">
      <div><h2 id={`${id}-heading`}>Word Families</h2><p role="status">{words.length} / {rows.length} dạng từ</p></div>
      <label className="vocab-search"><MagnifyingGlassIcon width={24} height={24} aria-hidden="true" /><input type="search" aria-label="Tìm dạng từ trong bài" placeholder="Tìm từ hoặc nghĩa trong bài…" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </div>
    {words.length ? <ol className="vocab-words">{words.map(row => <li key={row.index} value={row.index + 1}>
      <span className="vocab-wordNumber">{String(row.index + 1).padStart(2, '0')}</span>
      <div className="vocab-wordContent"><h3 lang="en">{row.word} <span className="vocab-partOfSpeech">({row.partOfSpeech})</span></h3><p className="vocab-phonetic" lang="en">{row.pronunciation}</p><p className="vocab-meaning" lang="vi">{row.meaning}</p></div>
      <div className="vocab-wordActions"><PronounceButton text={row.word} /><button type="button" className="vocab-exampleToggle" aria-expanded={expanded.has(row.index)} aria-controls={`${id}-example-${row.index}`} aria-label={`${expanded.has(row.index) ? 'Ẩn' : 'Xem'} ví dụ cho ${row.word}`} title={`${expanded.has(row.index) ? 'Ẩn' : 'Xem'} ví dụ`} onClick={() => toggle(row.index)}><ChatBubbleLeftEllipsisIcon width={22} height={22} aria-hidden="true" /></button></div>
      <div id={`${id}-example-${row.index}`} className="vocab-example" hidden={!expanded.has(row.index)}>
        <WordExample english={row.example} vietnamese={row.translation} term={row.word} />
      </div>
    </li>)}</ol> : <div className="vocab-empty"><h3>Không tìm thấy từ phù hợp</h3><p>Thử từ tiếng Anh hoặc nghĩa tiếng Việt khác.</p><button type="button" onClick={() => setQuery('')}>Xóa tìm kiếm</button></div>}
  </section>;
}
