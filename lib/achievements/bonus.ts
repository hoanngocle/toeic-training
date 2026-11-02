import { CATEGORIES } from './collection.ts';

export function badgeBonusPercent(tier: number): number {
  if (!Number.isSafeInteger(tier) || tier < 0) throw new RangeError('Invalid badge tier');
  return (tier + 1) * 0.5;
}
export function collectionBonusPercent(awards: Record<string, string>): number {
  let percent = 0;
  for (const category of CATEGORIES) {
    category.milestones.forEach((value, tier) => {
      if (Object.hasOwn(awards, `${category.id}:${value}`)) percent += badgeBonusPercent(tier);
    });
  }
  return percent;
}
