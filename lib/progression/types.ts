export type ProgressionSummary = {
  totalExp: number; level: number; realmKey: string; realmName: string; stageName: string | null;
  currentLevelExp: number; expToNextLevel: number; progressPercent: number; isMaxLevel: boolean;
};
export type RewardCalculation = {
  exp: number; version: string; questionCount: number; correctCount: number; baseTotal: number; scoreMultiplier: number;
};
export type ProgressionResult = {
  reward?: { exp: number; version: string };
  progressionChange?: { before: ProgressionSummary; after: ProgressionSummary };
};
