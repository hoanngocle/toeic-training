"use client";

import { LanguageIcon } from "@heroicons/react/24/outline";

export default function WordExample({ english, vietnamese, term, label = "VÍ DỤ" }: {
  english: string; vietnamese: string; term: string; label?: string;
}) {
  const start = english.toLowerCase().indexOf(term.toLowerCase());
  return <>
    <span className="vocab-exampleLabel">{label}</span>
    <p lang="en">{start < 0 ? english : <>{english.slice(0, start)}<strong>{english.slice(start, start + term.length)}</strong>{english.slice(start + term.length)}</>}</p>
    <details className="vocab-translation">
      <summary><LanguageIcon width={18} height={18} aria-hidden="true" /><span>Dịch</span></summary>
      <p lang="vi" className="vocab-exampleTranslation">{vietnamese}</p>
    </details>
  </>;
}
