"use client";

import Link from "next/link";
import { MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { LessonSummary } from "./catalog";
import { normalizeSearch } from "./search";


const categories = [
  { id: "part1", label: "Từ vựng Part 1" },
  { id: "part2", label: "Từ vựng Part 2" },
  { id: "essential", label: "600 TOEIC" },
] as const;
type Category = (typeof categories)[number]["id"];

export default function VocabularyLibrary({ lessons }: { lessons: LessonSummary[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const term = normalizeSearch(query);
  const visible = lessons.filter(lesson => {
    const lessonCategory: Category = lesson.source === "essential" ? "essential" : lesson.sourceLabel.startsWith("BTVN") ? "part2" : "part1";
    return (category === null || category === lessonCategory) && normalizeSearch(`${lesson.title} ${lesson.sourceLabel} ${lesson.groupTitle ?? ""} Bài ${lesson.number} ${lesson.searchText}`).includes(term);
  });
  const groups = new Map<string, { title: string; lessons: LessonSummary[] }>();
  for (const lesson of visible) {
    const key = lesson.source === "essential" ? `essential-${lesson.group}` : "original";
    const group = groups.get(key) ?? { title: lesson.source === "essential" ? lesson.groupTitle ?? "Essential Word" : "Từ vựng tiếng Anh", lessons: [] };
    group.lessons.push(lesson);
    groups.set(key, group);
  }
  return <>
    <section className="vocab-hero">
      <div><p className="vocab-eyebrow">GÓC HỌC TỪ CỦA BẠN</p><h1>Thư viện từ vựng</h1><p className="vocab-subtitle">Thêm một từ mới.<br/><em>Mở thêm một cách diễn đạt.</em></p></div>
      <div className="vocab-heroArt" aria-hidden="true"><span>Aa</span><SparklesIcon className="vocab-heroSpark" width={35} height={35} aria-hidden="true" /><small>MỖI TỪ LÀ MỘT KHỞI ĐẦU</small></div>
    </section>
    <section className="vocab-collection" aria-labelledby="lessons-heading">
      <div className="vocab-toolbar"><div className="vocab-collectionTitle"><h2 id="lessons-heading">Danh sách bài</h2></div><label className="vocab-search"><MagnifyingGlassIcon className="vocab-searchIcon" width={24} height={24} aria-hidden="true" /><input type="search" aria-label="Tìm bài, từ vựng hoặc nghĩa" placeholder="Tìm bài, từ vựng hoặc nghĩa…" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
      <div className="vocab-filters" role="group" aria-label="Lọc theo bộ từ vựng">
        {categories.map(item => <button key={item.id} type="button" className="vocab-filterBadge" aria-pressed={category === item.id} onClick={() => setCategory(current => current === item.id ? null : item.id)}>{item.label}</button>)}
      </div>
      {visible.length ? Array.from(groups, ([key, group]) => <section className="vocab-lessonGroup" key={key} aria-labelledby={`group-${key}`}><div className="vocab-groupHeading"><h3 id={`group-${key}`}>{group.title}</h3><span>{group.lessons.length} bài</span></div><div className="vocab-grid">{group.lessons.map(lesson => <article className="vocab-card" key={lesson.slug}>
        <Link href={`/tu-vung/${lesson.slug}`} className="vocab-coverArea" aria-label={`Mở ${lesson.title}`}><span className="vocab-badge vocab-coverBadge">{lesson.count} từ</span><div className="vocab-bookCover"><small>ENGLISH SPACE<br/>VOCABULARY COLLECTION</small><span>{String(lesson.number).padStart(2, "0")}</span><strong>{lesson.title}</strong>{lesson.sourceLabel && <small>{lesson.sourceLabel}</small>}<div>WORDS FOR YOUR NEXT CHAPTER</div></div></Link>
        {lesson.source === "essential" && <span className="vocab-badge essential-sourceBadge essential-cardBadge">Essential Word</span>}
      </article>)}</div></section>) : <div className="vocab-empty"><h3>Chưa tìm thấy bài phù hợp</h3><p>Thử tìm bằng số bài, từ tiếng Anh hoặc nghĩa tiếng Việt.</p><button onClick={() => setQuery("")}>Xóa tìm kiếm</button></div>}
    </section>
  </>;
}
