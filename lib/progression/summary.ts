import { progressionConfig } from './config.ts';
import type { ProgressionSummary } from './types.ts';

export function getProgression(totalExp: number): ProgressionSummary {
  if (!Number.isSafeInteger(totalExp) || totalExp < 0) throw new RangeError('EXP must be a non-negative safe integer');
  const {levels, realms} = progressionConfig;
  const entry = levels.findLast(level => level.cumulative_exp <= totalExp)!;
  const realm = realms.find(realm => realm.realm_key === entry.realm_key)!;
  const index = (entry.stage_index ?? 1) - 1;
  const stageName = realm.stage_scheme === 'none' ? null : realm.stage_scheme === 'nine_layers' ? `Tầng ${index + 1}` :
    (realm.realm_phase === 'cosmic' ? ['Sơ Giai','Trung Giai','Cao Giai','Cực Hạn'] : ['Sơ Kỳ','Trung Kỳ','Hậu Kỳ','Đại Viên Mãn'])[index];
  const isMaxLevel = entry.level === 200;
  const currentLevelExp = totalExp - entry.cumulative_exp;
  return {totalExp, level:entry.level, realmKey:realm.realm_key, realmName:realm.display_name_vi, stageName,
    currentLevelExp, expToNextLevel:isMaxLevel ? 0 : entry.exp_to_next_level-currentLevelExp,
    progressPercent:isMaxLevel ? 100 : currentLevelExp/entry.exp_to_next_level*100, isMaxLevel};
}
