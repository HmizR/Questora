import { ActivityType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { missionNeedsAttention, parseAnalyticsQuery, toCsv } from "@/lib/lecturer-analytics";

describe("lecturer analytics helpers", () => {
  it("parses safe query values and falls back from unsafe ones", () => {
    const parsed = parseAnalyticsQuery(
      {
        q: " Ada ",
        status: "unknown",
        attention: "needs-attention",
        sort: "bad-sort",
        dir: "sideways"
      },
      {
        defaultSort: "name",
        allowedSorts: ["name", "score"] as const,
        allowedStatuses: ["passed"] as const
      }
    );

    expect(parsed).toEqual({
      q: "Ada",
      status: "all",
      attention: "needs-attention",
      sort: "name",
      dir: "asc"
    });
  });

  it("flags actionable assignment and quiz states", () => {
    const pastDue = new Date("2026-01-01T00:00:00.000Z");
    const futureDue = new Date("2099-01-01T00:00:00.000Z");

    expect(
      missionNeedsAttention({
        type: ActivityType.ASSIGNMENT,
        hasSubmission: true,
        hasGrade: false
      })
    ).toBe(true);
    expect(
      missionNeedsAttention({
        type: ActivityType.PROJECT,
        hasSubmission: true,
        hasGrade: true,
        gradePublishedAt: null
      })
    ).toBe(true);
    expect(
      missionNeedsAttention({
        type: ActivityType.ASSIGNMENT,
        dueAt: pastDue,
        hasSubmission: false
      })
    ).toBe(true);
    expect(
      missionNeedsAttention({
        type: ActivityType.QUIZ,
        attemptsUsed: 2,
        maxAttempts: 2,
        hasPassed: false
      })
    ).toBe(true);
    expect(
      missionNeedsAttention({
        type: ActivityType.ASSIGNMENT,
        dueAt: futureDue,
        hasSubmission: false
      })
    ).toBe(false);
    expect(
      missionNeedsAttention({
        type: ActivityType.ASSIGNMENT,
        hasSubmission: false
      })
    ).toBe(false);
  });

  it("escapes CSV cells safely", () => {
    expect(
      toCsv([
        ["Name", "Feedback"],
        ["Ada, Student", "Great \"quoted\" work\nNext line"]
      ])
    ).toBe('Name,Feedback\r\n"Ada, Student","Great ""quoted"" work\nNext line"\r\n');
  });
});
