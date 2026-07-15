import { describe, expect, it } from "vitest";

import {
  calculateQuizAnalytics,
  canRevealQuizCorrectAnswers,
  parseStoredQuizAttempt
} from "@/lib/quiz-analytics";
import type { QuizDefinition } from "@/lib/quiz";

const definition: QuizDefinition = {
  version: 1,
  questions: [
    {
      id: "q1",
      type: "MULTIPLE_CHOICE",
      prompt: "Pick B",
      options: ["A", "B", "C"],
      correctOptionIndex: 1,
      points: 3
    },
    {
      id: "q2",
      type: "TRUE_FALSE",
      prompt: "True is correct",
      options: ["True", "False"],
      correctOptionIndex: 0,
      points: 2
    }
  ]
};

describe("quiz analytics", () => {
  it("parses stored quiz attempt answer JSON", () => {
    const parsed = parseStoredQuizAttempt({
      studentId: "student-1",
      attemptNo: 1,
      score: 3,
      maxScore: 5,
      passed: false,
      submittedAt: new Date("2026-01-01T00:00:00.000Z"),
      answers: {
        selected: { q1: 1, q2: 1 },
        results: [
          {
            questionId: "q1",
            selectedOptionIndex: 1,
            correctOptionIndex: 1,
            isCorrect: true,
            pointsAwarded: 3,
            pointsPossible: 3
          }
        ]
      }
    });

    expect(parsed.selected).toEqual({ q1: 1, q2: 1 });
    expect(parsed.results[0]).toMatchObject({
      questionId: "q1",
      isCorrect: true,
      pointsAwarded: 3
    });
  });

  it("calculates summary and per-question analytics", () => {
    const analytics = calculateQuizAnalytics({
      definition,
      totalStudents: 3,
      attempts: [
        {
          studentId: "student-1",
          attemptNo: 1,
          score: 3,
          maxScore: 5,
          passed: false,
          submittedAt: new Date(),
          answers: {
            selected: { q1: 1, q2: 1 },
            results: [
              {
                questionId: "q1",
                selectedOptionIndex: 1,
                correctOptionIndex: 1,
                isCorrect: true,
                pointsAwarded: 3,
                pointsPossible: 3
              },
              {
                questionId: "q2",
                selectedOptionIndex: 1,
                correctOptionIndex: 0,
                isCorrect: false,
                pointsAwarded: 0,
                pointsPossible: 2
              }
            ]
          }
        },
        {
          studentId: "student-2",
          attemptNo: 1,
          score: 5,
          maxScore: 5,
          passed: true,
          submittedAt: new Date(),
          answers: {
            selected: { q1: 1, q2: 0 },
            results: [
              {
                questionId: "q1",
                selectedOptionIndex: 1,
                correctOptionIndex: 1,
                isCorrect: true,
                pointsAwarded: 3,
                pointsPossible: 3
              },
              {
                questionId: "q2",
                selectedOptionIndex: 0,
                correctOptionIndex: 0,
                isCorrect: true,
                pointsAwarded: 2,
                pointsPossible: 2
              }
            ]
          }
        }
      ]
    });

    expect(analytics).toMatchObject({
      attemptCount: 2,
      participantCount: 2,
      averageScore: 4,
      bestScore: 5
    });
    expect(Math.round(analytics.passRate)).toBe(50);
    expect(Math.round(analytics.completionRate)).toBe(67);
    expect(analytics.questionBreakdown[0]).toMatchObject({
      correctResponses: 2,
      totalResponses: 2,
      correctRate: 100
    });
    expect(analytics.questionBreakdown[1]?.optionCounts).toEqual([
      { option: "True", optionIndex: 0, count: 1 },
      { option: "False", optionIndex: 1, count: 1 }
    ]);
  });

  it("reveals correct answers only after passing or exhausting attempts", () => {
    expect(canRevealQuizCorrectAnswers({ hasPassed: false, remainingAttempts: 1 })).toBe(false);
    expect(canRevealQuizCorrectAnswers({ hasPassed: false, remainingAttempts: null })).toBe(false);
    expect(canRevealQuizCorrectAnswers({ hasPassed: true, remainingAttempts: 1 })).toBe(true);
    expect(canRevealQuizCorrectAnswers({ hasPassed: false, remainingAttempts: 0 })).toBe(true);
  });
});
