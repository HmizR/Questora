import { describe, expect, it } from "vitest";

import { getLevelProgress } from "../lib/gamification";

describe("getLevelProgress", () => {
  it("calculates next-level progress from total XP", () => {
    expect(getLevelProgress(0)).toMatchObject({
      level: 1,
      nextLevelXp: 100,
      xpToNextLevel: 100,
      percent: 0
    });

    expect(getLevelProgress(250)).toMatchObject({
      level: 2,
      currentLevelFloor: 100,
      nextLevelXp: 400,
      xpToNextLevel: 150,
      percent: 50
    });
  });
});
