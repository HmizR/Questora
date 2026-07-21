import { ActivityType, ProgressStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { classifyDeadline, isActivityFinishedForDeadline } from "@/lib/deadlines";

describe("deadline helpers", () => {
  const now = new Date(2026, 6, 20, 12, 0, 0);

  it("classifies overdue, due today, due soon, future, and no-date deadlines", () => {
    expect(classifyDeadline(null, now)).toBe("no-date");
    expect(classifyDeadline(new Date(2026, 6, 18, 23, 59, 0), now)).toBe("overdue");
    expect(classifyDeadline(new Date(2026, 6, 20, 23, 59, 0), now)).toBe("due-today");
    expect(classifyDeadline(new Date(2026, 6, 27, 12, 0, 0), now)).toBe("due-soon");
    expect(classifyDeadline(new Date(2026, 6, 28, 12, 0, 0), now)).toBe("future");
  });

  it("uses mission-specific completion rules for deadline lists", () => {
    expect(
      isActivityFinishedForDeadline({
        type: ActivityType.LESSON,
        progressStatus: ProgressStatus.COMPLETED
      })
    ).toBe(true);
    expect(
      isActivityFinishedForDeadline({
        type: ActivityType.ASSIGNMENT,
        hasSubmission: true
      })
    ).toBe(true);
    expect(
      isActivityFinishedForDeadline({
        type: ActivityType.PROJECT,
        hasSubmission: false
      })
    ).toBe(false);
    expect(
      isActivityFinishedForDeadline({
        type: ActivityType.QUIZ,
        hasPassedQuiz: true
      })
    ).toBe(true);
  });
});
