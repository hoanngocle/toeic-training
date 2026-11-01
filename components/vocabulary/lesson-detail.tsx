"use client";

import Link from "next/link";
import { MagnifyingGlassIcon, ChatBubbleLeftEllipsisIcon, ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { Lesson, LessonSummary } from "./catalog";
import PracticeWorkspace from "./practice/workspace";
import PronounceButton from "./pronounce-button";
import WordExample from "./word-example";
import { normalizeSearch } from "./search";
import type { EssentialTab, PublicBookSection } from "../../lib/essential/types";


type Navigation = Pick<LessonSummary, "slug" | "title" | "count">[];
export default function LessonDetail({ lesson, navigation, sections }: { lesson: Lesson; navigation: Navigation; sections?: Partial<Record<EssentialTab, PublicBookSection>> }) {
  const [query, setQuery] = useState("");
  const [expandedExamples, setExpandedExamples] = useState<Set<number>>(() => new Set());
  function toggleExample(id: number) {
    setExpandedExamples(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const term = normalizeSearch(query);
  const words = lesson.words.filter(word => normalizeSearch(`${word.term} ${word.meaning}`).includes(term));
  const index = navigation.findIndex(item => item.slug === lesson.slug);
  const previous = navigation[index - 1];
  const next = navigation[index + 1];
  return <>
    <nav className="vocab-breadcrumb" aria-label="Đường dẫn"><Link href="/tu-vung">Từ vựng</Link><span>/</span><span aria-current="page">{lesson.title}</span></nav>
    <section className="vocab-lessonHero"><div><p className="vocab-eyebrow">BÀI {String(lesson.number).padStart(2, "0")} / {navigation.length} · {lesson.source === "essential" ? lesson.groupTitle : lesson.sourceTitle.match(/BTVN \d+/)?.[0] ?? "TỪ VỰNG TIẾNG ANH"}</p><h1>{lesson.title}</h1>{lesson.source === "essential" && <span className="vocab-badge essential-sourceBadge">Essential Word</span>}</div><span className="vocab-lessonNumber" aria-hidden="true">{String(lesson.number).padStart(2, "0")}</span></section>
    <PracticeWorkspace lesson={lesson} sections={sections}>
    <div className="vocab-detailContent">
      <section className="vocab-wordSection" aria-labelledby="words-heading">
        <div className="vocab-wordToolbar"><div><h2 id="words-heading">Từ vựng trong bài</h2><p role="status">{words.length} / {lesson.words.length} từ</p></div><label className="vocab-search"><MagnifyingGlassIcon className="vocab-searchIcon" width={24} height={24} aria-hidden="true" /><input type="search" aria-label="Tìm từ trong bài" placeholder="Tìm từ hoặc nghĩa trong bài…" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
        {words.length ? <ol className="vocab-words">{words.map(word => <li key={word.id} value={word.id}><span className="vocab-wordNumber">{String(word.id).padStart(2, "0")}</span><div className="vocab-wordContent"><h3 lang="en">{word.term}</h3><p className="vocab-phonetic" lang="en">{word.pronunciation}</p><p className="vocab-meaning">{word.meaning}</p>
</div><div className="vocab-wordActions"><PronounceButton text={word.spokenText}/>
          {word.example && <button type="button" className="vocab-exampleToggle" onClick={() => toggleExample(word.id)} aria-expanded={expandedExamples.has(word.id)} aria-controls={`example-${lesson.slug}-${word.id}`} aria-label={`${expandedExamples.has(word.id) ? "Ẩn" : "Xem"} ví dụ cho ${word.spokenText}`} title={`${expandedExamples.has(word.id) ? "Ẩn" : "Xem"} ví dụ`}>
            <ChatBubbleLeftEllipsisIcon width={22} height={22} aria-hidden="true" />
          </button>}
        </div>
          {word.example && <div id={`example-${lesson.slug}-${word.id}`} className="vocab-example" hidden={!expandedExamples.has(word.id)}><WordExample english={word.example.english} vietnamese={word.example.vietnamese} term={word.spokenText} label="VÍ DỤ" /></div>}
        </li>)}</ol> : <div className="vocab-empty"><h3>Không tìm thấy từ phù hợp</h3><p>Thử từ tiếng Anh hoặc nghĩa tiếng Việt khác.</p><button onClick={() => setQuery("")}>Xóa tìm kiếm</button></div>}
        <nav className="vocab-pagination" aria-label="Chuyển bài"><div>{previous && <Link href={`/tu-vung/${previous.slug}`}><small><ArrowLeftIcon width={18} height={18} aria-hidden="true" /> BÀI TRƯỚC</small><strong>{previous.title}</strong></Link>}</div><div>{next && <Link href={`/tu-vung/${next.slug}`}><small>BÀI TIẾP THEO <ArrowRightIcon width={18} height={18} aria-hidden="true" /></small><strong>{next.title}</strong></Link>}</div></nav>
      </section>
    </div>
    </PracticeWorkspace>
  </>;
}
