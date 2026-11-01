'use client';
import { ProgressionCard } from '../progression/progression-card';
import type { ProgressionSummary } from '../../lib/progression/types';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, FireIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { activityDay, calendarDays, shiftDay } from '../../lib/achievements/summary';
import type { AchievementsData } from '../../lib/achievements/summary';
import './achievements.css';
import Badge from './badge';
import { CATEGORIES } from '../../lib/achievements/collection';

function moveMonth(month: string, amount: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
const formatMonth = (month: string) => new Intl.DateTimeFormat('vi-VN', {month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`));
const formatDay = (day: string) => new Intl.DateTimeFormat('vi-VN', {dateStyle:'full', timeZone:'UTC'}).format(new Date(`${day}T00:00:00Z`));

export default function Achievements({data,progression}: {data: AchievementsData; progression: ProgressionSummary | null}) {
  const [month, setMonth] = useState(data.today.slice(0, 7));
  const router = useRouter();
  useEffect(() => {
    const refresh = () => router.refresh();
    const timer = window.setInterval(() => { if (activityDay() !== data.today) refresh(); }, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [data.today, router]);
  const active = new Set(data.days);
  const badges = CATEGORIES.flatMap(category => category.milestones.map((value,tier) => ({category,value,tier,earned:data.collection.awards[`${category.id}:${value}`]})));
  const unlocked = badges.filter(badge=>badge.earned);
  const latest = [...unlocked].sort((a,b)=>b.earned.localeCompare(a.earned)||b.tier-a.tier)[0];
  const [filter,setFilter] = useState<'all'|'earned'|'locked'>('all');
  const studiedToday = active.has(data.today);
  return <div className="achievements-page">
    <header className="achievements-heading"><div><p className="achievements-eyebrow">MỖI NGÀY MỘT CHÚT TIẾN BỘ</p><h1>Thành tích của bạn<span>.</span></h1><p>Những nỗ lực nhỏ, những cột mốc đáng nhớ.</p></div><Link href="/tu-vung" className="primary-button">Tiếp tục học <span aria-hidden="true">↗</span></Link></header>
    <ProgressionCard summary={progression}/>
    <section aria-labelledby="recent-activity-title"><h2 id="recent-activity-title" className="achievements-section-title">Hoạt động gần đây</h2>
      <div className="achievements-activity">
        <div className="achievements-latest"><h3>{latest ? 'Mới đạt được' : 'Cột mốc đầu tiên'}</h3><p>{latest ? `${latest.value} ${latest.category.unit}` : 'Bắt đầu với 1 lượt học'}</p><Badge category={latest?.category.id ?? 'sessions'} value={latest?.value ?? 1} tier={latest?.tier ?? 0} locked={!latest}/><span className="achievements-badge-caption">{latest ? formatDay(latest.earned) : 'Huy hiệu đầu tiên đang chờ bạn'}</span></div>
        <div className="achievements-calendar">
          <div className="achievements-calendar-heading"><h3 aria-live="polite">{formatMonth(month)}</h3><div><button aria-label="Tháng trước" onClick={() => setMonth(moveMonth(month, -1))}><ChevronLeftIcon/></button><button aria-label="Tháng sau" disabled={month >= data.today.slice(0, 7)} onClick={() => setMonth(moveMonth(month, 1))}><ChevronRightIcon/></button></div></div>
          <div className="achievements-weekdays" aria-hidden="true">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="achievements-days" role="list" aria-label={`Lịch hoạt động ${formatMonth(month)}`}>
            {calendarDays(month).map((day, index) => {
              const inMonth = day.startsWith(month);
              const learned = active.has(day);
              const previous = index % 7 !== 0 && active.has(shiftDay(day, -1));
              const following = index % 7 !== 6 && active.has(shiftDay(day, 1));
              return <div key={day} role="listitem" aria-current={day === data.today ? 'date' : undefined} aria-label={`${formatDay(day)}${day === data.today ? ', hôm nay' : ''}: ${learned ? 'đã học' : day > data.today ? 'chưa đến' : 'chưa có hoạt động'}`} title={`${formatDay(day)} · ${learned ? 'Đã học' : 'Chưa có hoạt động'}`} className={`achievement-day${inMonth ? '' : ' outside'}${learned ? ' studied' : ''}${previous ? ' connected-left' : ''}${following ? ' connected-right' : ''}${day === data.today ? ' today' : ''}`}>
                {learned && <FireIcon aria-hidden="true"/>}<span>{Number(day.slice(-2))}</span>
              </div>;
            })}
          </div>
          <div className="achievements-calendar-legend"><span><FireIcon aria-hidden="true"/> Ngày có hoạt động học</span>{month !== data.today.slice(0, 7) && <button onClick={() => setMonth(data.today.slice(0, 7))}>Về tháng này</button>}</div>
        </div>
        <div className="achievements-streak"><h3>Chuỗi hiện tại</h3><p><strong>{data.current}</strong> ngày liên tiếp</p><div className={`achievements-flame${data.current ? ' burning' : ''}`}><FireIcon aria-hidden="true"/><span>{data.current}</span></div><span className={`achievements-today${studiedToday ? ' completed' : ''}`}>{studiedToday ? <><CheckIcon aria-hidden="true"/> Hôm nay đã học</> : 'Học hôm nay để tiếp lửa'}</span><p className="achievements-best">Kỷ lục của bạn: <strong>{data.longest} ngày</strong></p></div>
      </div>
      <p className="achievements-note">Chỉ cần một hoạt động học mỗi ngày để nối dài chuỗi. Ngày được tính theo giờ Việt Nam (GMT+7).</p>
    </section>
    <div className="achievements-stats"><div><span>Tổng lượt học</span><strong>{data.totalSessions.toLocaleString('vi-VN')}<small> lượt</small></strong></div><div><span>Số ngày đã học</span><strong>{data.activeDays}<small> ngày</small></strong></div><div><span>Chuỗi dài nhất</span><strong>{data.longest}<small> ngày</small></strong></div></div>
    <section aria-labelledby="milestones-title" className="achievements-milestones">
      <div className="achievements-milestones-heading"><h2 id="milestones-title" className="achievements-section-title"><TrophyIcon aria-hidden="true"/> Bộ sưu tập thành tựu</h2><p>{unlocked.length}/43 huy hiệu đã mở khóa</p></div>
      <div className="collection-filters" role="group" aria-label="Lọc thành tựu">{([{id:'all',label:'Tất cả'},{id:'earned',label:'Đã đạt được'},{id:'locked',label:'Chưa mở khóa'}] as const).map(item=><button key={item.id} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}</button>)}</div>
      {CATEGORIES.map(category=>{
        const items=badges.filter(b=>b.category.id===category.id && (filter==='all'||(filter==='earned'?!!b.earned:!b.earned)));
        if(!items.length)return null;
        const count=data.collection.counts[category.id];
        return <section key={category.id} className="collection-category" aria-labelledby={`category-${category.id}`}><div className="collection-category-heading"><h3 id={`category-${category.id}`}>{category.title}</h3><span>{count.toLocaleString('vi-VN')} {category.unit}</span></div><p className="collection-description">{category.description}</p><div className="collection-grid">{items.map(({value,tier,earned})=><article key={value} className={`collection-card${earned?' earned':''}`}>
          <Badge category={category.id} value={value} tier={tier} locked={!earned} small/>
          <h4>{value.toLocaleString('vi-VN')} {category.unit}</h4>
          {earned?<p className="collection-earned"><CheckIcon aria-hidden="true"/><span>Đã đạt · <time dateTime={earned}>{new Intl.DateTimeFormat('vi-VN',{day:'numeric',month:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${earned}T00:00:00Z`))}</time></span></p>:<div className="collection-progress"><span>{Math.min(count,value).toLocaleString('vi-VN')}/{value.toLocaleString('vi-VN')} · Chưa mở khóa</span><progress value={Math.min(count,value)} max={value} aria-label={`Tiến độ ${value} ${category.unit}`}/></div>}
        </article>)}</div></section>;
      })}
      {filter==='earned'&&!unlocked.length&&<p className="collection-empty">Chưa có huy hiệu. Hoàn thành một hoạt động học để bắt đầu bộ sưu tập!</p>}
      {filter==='locked'&&unlocked.length===43&&<p className="collection-empty">Bạn đã chinh phục tất cả 43 thành tựu!</p>}
      <p className="achievements-note">Huy hiệu đã đạt được sẽ được giữ vĩnh viễn. Ngày đạt được tính theo giờ Việt Nam.</p>
    </section>
  </div>;
}
