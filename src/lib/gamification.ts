import { calculateLevel } from "./level";

export function getLevelProgress(totalXp: number) {
  const level = calculateLevel(totalXp);
  const currentLevelFloor = (level - 1) ** 2 * 100;
  const nextLevelXp = level ** 2 * 100;
  const span = nextLevelXp - currentLevelFloor;
  const earnedInLevel = Math.max(0, totalXp - currentLevelFloor);
  const percent = span > 0 ? Math.min(100, Math.round((earnedInLevel / span) * 100)) : 100;

  return {
    level,
    totalXp,
    currentLevelFloor,
    nextLevelXp,
    earnedInLevel,
    xpToNextLevel: Math.max(0, nextLevelXp - totalXp),
    percent
  };
}
