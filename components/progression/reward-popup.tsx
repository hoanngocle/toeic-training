'use client';

import { useEffect, useId, useRef } from 'react';
import { SparklesIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import type { ProgressionResult } from '../../lib/progression/types';
import './progression.css';

export function RewardPopup({result}: {result:ProgressionResult & {id:string}}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const continueButton=useRef<HTMLButtonElement>(null);
  const titleId=useId();
  const descriptionId=useId();
  const hasReward=!!result.reward;
  // Depend on the saved session identity, not object identity: refreshes must
  // not reopen a dismissed reward. showModal also provides native focus trapping.
  useEffect(()=>{
    if(hasReward && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      continueButton.current?.focus();
    }
  },[result.id,hasReward]);
  if(!result.reward)return null;
  const change=result.progressionChange;
  const leveledUp=change && change.after.level>change.before.level;
  const realmUp=change && change.after.realmKey!==change.before.realmKey;
  return <dialog ref={dialog} className="reward-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}>
    <button type="button" className="reward-dialog-close" aria-label="Đóng thông báo EXP" onClick={()=>dialog.current?.close()}><XMarkIcon width={20} height={20}/></button>
    <div className="reward-dialog-emblem" aria-hidden="true"><SparklesIcon width={34} height={34}/></div>
    <p className="reward-dialog-eyebrow">BÀI HỌC ĐÃ ĐƯỢC LƯU</p>
    <h2 id={titleId}>{realmUp?'Một cảnh giới mới!':leveledUp?'Bạn đã lên cấp!':'Thêm một bước tiến'}</h2>
    <p id={descriptionId} className="reward-dialog-description">{result.reward.exp>0?'Nỗ lực của bạn đã được ghi nhận.':'Lượt luyện tập đã được lưu. Cùng thử lại để nhận EXP nhé.'}</p>
    <div className="reward-dialog-amount"><strong>+{result.reward.exp.toLocaleString('vi-VN')}</strong><span>EXP</span></div>
    {!!result.reward.badgeBonusPercent && <p className="reward-dialog-description">EXP gốc: {result.reward.baseExp?.toLocaleString('vi-VN')} · Huy hiệu +{result.reward.badgeBonusPercent.toLocaleString('vi-VN')}% (+{result.reward.bonusExp?.toLocaleString('vi-VN')} EXP)</p>}
    {change && <div className="reward-dialog-progress">
      <div className="reward-dialog-levels"><span>Level {change.before.level}</span>{leveledUp?<><ArrowRightIcon width={16} height={16} aria-hidden="true"/><strong>Level {change.after.level}</strong></>:<strong>Đang tiến bộ</strong>}</div>
      <p>{change.after.realmName}{change.after.stageName && <span> · {change.after.stageName}</span>}</p>
      <div className="progression-track" role="progressbar" aria-label="EXP sau bài học" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(change.after.progressPercent)}><span style={{width:`${change.after.progressPercent}%`}}/></div>
      <small>{change.after.isMaxLevel?'Đã đạt cấp tối đa':`Còn ${change.after.expToNextLevel.toLocaleString('vi-VN')} EXP để lên level ${change.after.level+1}`}</small>
    </div>}
    <button type="button" className="reward-dialog-continue" ref={continueButton} onClick={()=>dialog.current?.close()}>Tiếp tục học <ArrowRightIcon width={18} height={18} aria-hidden="true"/></button>
  </dialog>;
}
