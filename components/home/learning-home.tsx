"use client";
import { ProgressionCard } from "../progression/progression-card";
import type { ProgressionSummary } from "../../lib/progression/types";

import { HomeIcon, BookOpenIcon, PencilSquareIcon, ArrowRightIcon, SunIcon, MoonIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import "./home.css";

const icons = {
  home: HomeIcon,
  read: BookOpenIcon,
  grammar: PencilSquareIcon,
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
            <Link id="grammar" href="/ngu-phap" className="skill-card"><div className="skill-card-top"><div className="skill-icon"><Icon name="grammar"/></div></div><div className="skill-title"><h3>Ngữ Pháp</h3><span lang="en">Grammar</span></div><div className="tags"><span>Ngữ pháp TOEIC</span><span>Lý thuyết & luyện tập</span></div><div className="skill-card-bottom">Xem các bài học <Icon name="arrow"/></div></Link><Link href="/ets-2024" className="skill-card"><div className="skill-card-top"><div className="skill-icon"><Icon name="read"/></div></div><div className="skill-title"><h3>ETS 2024</h3><span lang="en">Listening & Reading</span></div><div className="tags"><span>10 đề</span><span>200 câu / đề</span></div><div className="skill-card-bottom">Luyện đề TOEIC <Icon name="arrow"/></div></Link></div></section>
    </div>
  );
}
