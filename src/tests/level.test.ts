import { describe, expect, it } from "vitest";

import { calculateLevel } from "../lib/level";

describe("calculateLevel", () => {
  it("starts students at level 1", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("uses the MVP square-root XP formula", () => {
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(400)).toBe(3);
    expect(calculateLevel(900)).toBe(4);
  });
});
