import { SparklesIcon } from '@heroicons/react/24/outline';
import type { ProgressionSummary, ProgressionResult } from '../../lib/progression/types';
import './progression.css';

const number = (value:number) => value.toLocaleString('vi-VN');
export function ProgressionCard({summary,variant='default'}: {summary:ProgressionSummary | null;variant?:'default'|'home'}) {
  if (!summary) return <section className="progression-card" aria-label="Tiến độ tu luyện"><div><span className="progression-eyebrow">HÀNH TRÌNH HỌC TẬP</span><h2>Tiến độ đang được đồng bộ</h2><p>Lịch sử học của bạn vẫn được giữ nguyên. EXP sẽ hiển thị khi đồng bộ hoàn tất.</p></div></section>;
  if(variant==='home') return <section className="home-progression" aria-label="Level và cảnh giới">
    <div className="home-progression-identity">
      <div className="home-progression-seal" aria-hidden="true"><SparklesIcon width={26} height={26}/></div>
      <div><span className="progression-eyebrow">CẢNH GIỚI HIỆN TẠI</span><div className="home-progression-realm"><h2>{summary.realmName}</h2>{summary.stageName && <span>{summary.stageName}</span>}</div></div>
    </div>
    <div className="home-progression-experience">
      <div className="home-progression-topline"><span className="home-progression-level">Level <strong>{summary.level}</strong></span><span>{summary.isMaxLevel?'Cấp tối đa':<><strong>{number(summary.currentLevelExp)}</strong> / {number(summary.currentLevelExp+summary.expToNextLevel)} EXP</>}</span></div>
      <div className="progression-track" role="progressbar" aria-label={summary.isMaxLevel?'Đã đạt cấp tối đa':`Tiến độ đến level ${summary.level+1}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(summary.progressPercent)} aria-valuetext={summary.isMaxLevel?'Đã đạt cấp tối đa':`Còn ${number(summary.expToNextLevel)} EXP để lên level ${summary.level+1}`}><span style={{width:`${summary.progressPercent}%`}}/></div>
      <div className="home-progression-bottomline"><span>{summary.isMaxLevel?'Siêu Thoát — Cực Hạn':`Còn ${number(summary.expToNextLevel)} EXP đến level ${summary.level+1}`}</span><span>Tổng {number(summary.totalExp)} EXP</span></div>
    </div>
  </section>;
  return <section className="progression-card" aria-label="Level và cảnh giới">
    <div className="progression-level"><span>LEVEL</span><strong>{summary.level}</strong></div>
    <div className="progression-content">
      <span className="progression-eyebrow">HÀNH TRÌNH HỌC TẬP</span>
      <div className="progression-title"><h2>{summary.realmName}</h2>{summary.stageName && <span>{summary.stageName}</span>}</div>
      <div className="progression-track" role="progressbar" aria-label={summary.isMaxLevel?'Đã đạt cấp tối đa':`Tiến độ đến level ${summary.level+1}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(summary.progressPercent)} aria-valuetext={summary.isMaxLevel?'Đã đạt cấp tối đa':`Còn ${number(summary.expToNextLevel)} EXP để lên level ${summary.level+1}`}><span style={{width:`${summary.progressPercent}%`}}/></div>
      <div className="progression-meta"><span>{summary.isMaxLevel?'Đã đạt cấp tối đa':`${number(summary.currentLevelExp)} / ${number(summary.currentLevelExp+summary.expToNextLevel)} EXP`}</span><span>Tổng {number(summary.totalExp)} EXP</span></div>
    </div>
  </section>;
}
export function RewardNotice({result}: {result:ProgressionResult & {id:string}}) {
  if (!result.reward) return null;
  const change=result.progressionChange;
  const levelUp=change && change.after.level>change.before.level;
  const realmUp=change && change.after.realmKey!==change.before.realmKey;
  return <div className="progression-reward" role="status">
    <strong>+{number(result.reward.exp)} EXP</strong>
    {levelUp && <span>Đã lên level {change.after.level}{realmUp?` · ${change.after.realmName}${change.after.stageName?` — ${change.after.stageName}`:''}`:''}</span>}
  </div>;
}
