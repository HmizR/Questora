import { describe, expect, it } from "vitest";

import {
  quizAttemptLimitLabel,
  submissionActionLabel,
  submissionSummaryLabel
} from "@/lib/learning-display";

describe("learning display helpers", () => {
  it("labels assignment submission states", () => {
    expect(submissionActionLabel(undefined)).toBe("Submit assignment");
    expect(submissionActionLabel("SUBMITTED")).toBe("Update submission");
    expect(submissionSummaryLabel(undefined)).toBe("Not submitted");
    expect(submissionSummaryLabel("SUBMITTED")).toBe("Submitted, editable until graded");
    expect(submissionSummaryLabel("RETURNED")).toBe("Returned, editable");
    expect(submissionSummaryLabel("GRADED")).toBe("Graded, locked");
  });

  it("labels quiz attempt limits", () => {
    expect(
      quizAttemptLimitLabel({
        attemptsUsed: 2,
        maxAttempts: 3,
        remainingAttempts: 1
      })
    ).toBe("2 / 3 attempts used (1 remaining)");
    expect(
      quizAttemptLimitLabel({
        attemptsUsed: 2,
        maxAttempts: null,
        remainingAttempts: null
      })
    ).toBe("2 / unlimited attempts used");
  });
});
