"use client";
import { ProgressionCard } from "../progression/progression-card";
import type { ProgressionSummary } from "../../lib/progression/types";

import { HomeIcon, MicrophoneIcon, BookOpenIcon, PencilSquareIcon, ArrowRightIcon, SunIcon, MoonIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import "./home.css";

const icons = {
  home: HomeIcon,
  speak: MicrophoneIcon,
  read: BookOpenIcon,
  write: PencilSquareIcon,
  arrow: ArrowRightIcon,
  sun: SunIcon,
  moon: MoonIcon,
  clock: ClockIcon,
  spark: SparklesIcon,
};

function Icon({ name, className = "" }: { name: keyof typeof icons; className?: string }) {
  const HeroIcon = icons[name];
  return <HeroIcon className={className} width={22} height={22} aria-hidden="true" />;
}

const skills = [
  { id: "speak", label: "Nói", english: "Speaking", color: "#b1a1ef", tags: ["Phát âm", "Giao tiếp"], detail: "Luyện phát âm và tập diễn đạt ý tưởng qua các tình huống giao tiếp hằng ngày.", activity: "Đọc thành tiếng · Luyện câu mẫu · Nói theo chủ đề" },
  { id: "read", label: "Đọc", english: "Reading", color: "#91caa6", tags: ["Đọc hiểu", "Từ vựng"], detail: "Đọc những đoạn văn ngắn, khám phá từ vựng trong ngữ cảnh và luyện tìm ý chính.", activity: "Đọc đoạn văn · Tìm ý chính · Khám phá từ mới" },
  { id: "write", label: "Viết", english: "Writing", color: "#e6bc83", tags: ["Ngữ pháp", "Diễn đạt"], detail: "Bắt đầu từ một câu đơn giản, từng bước viết đoạn văn và trình bày ý tưởng mạch lạc.", activity: "Sắp xếp câu · Viết đoạn ngắn · Viết theo chủ đề" },
] as const;

export default function LearningHome({ vocabularyStats, progression }: { progression: ProgressionSummary | null; vocabularyStats: { lessons: number; words: number } }) {
  return (
    <div className="main-content home-content">
          <section className="hero">
            <div className="hero-copy"><h1>Học tiếng Anh<br/><span>theo nhịp của bạn.</span></h1><p>Chọn kỹ năng và bắt đầu luyện tập.</p><a href="#skills" className="primary-button">Chọn kỹ năng <Icon name="arrow"/></a></div>
            <div className="hero-art" lang="en" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-dot dot-one"/><div className="art-dot dot-two"/><div className="art-card card-back">Aa</div><div className="art-card card-front"><span className="quote-mark">“</span><span>Little steps.<br/><strong>Big possibilities.</strong></span></div><SparklesIcon className="art-plus" width={30} height={30} aria-hidden="true" /></div>
          </section>
          <ProgressionCard summary={progression} variant="home" />
          <section id="skills" className="skills-section" aria-labelledby="skills-heading"><div className="section-heading"><div><h2 id="skills-heading">Kỹ năng</h2></div></div><div className="skill-grid">
            <Link href="/tu-vung" className="skill-card">
              <div className="skill-card-top"><div className="skill-icon"><Icon name="read"/></div></div>
              <div className="skill-title"><h3>Từ Vựng</h3><span lang="en">Vocabulary</span></div>
              <div className="tags"><span>{vocabularyStats.lessons} bài học</span><span>{vocabularyStats.words} từ</span></div>
              <div className="skill-card-bottom">Xem các bài học <Icon name="arrow"/></div>
            </Link>
            {skills.map(skill => <div id={skill.id} className="skill-card" key={skill.id}><div className="skill-card-top"><div className="skill-icon"><Icon name={skill.id}/></div></div><div className="skill-title"><h3>{skill.label}</h3><span lang="en">{skill.english}</span></div><div className="tags">{skill.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="skill-card-bottom">Sắp có bài luyện</div></div>)}</div></section>
    </div>
  );
}
