import { describe, expect, it } from "vitest";

import {
  buildQuizDefinitionFromForm,
  getQuizMaxScore,
  parseQuizDefinition,
  scoreQuiz,
  serializeQuizDefinition
} from "@/lib/quiz";

describe("quiz helpers", () => {
  it("builds and parses quiz definitions from lecturer form fields", () => {
    const definition = buildQuizDefinitionFromForm({
      quizQuestion1Type: "MULTIPLE_CHOICE",
      quizQuestion1Prompt: "Which tag represents main page content?",
      quizQuestion1Option1: "section",
      quizQuestion1Option2: "main",
      quizQuestion1Option3: "aside",
      quizQuestion1Option4: "footer",
      quizQuestion1CorrectOption: "2",
      quizQuestion1Points: "2",
      quizQuestion2Type: "TRUE_FALSE",
      quizQuestion2Prompt: "Semantic HTML helps assistive technology.",
      quizQuestion2CorrectOption: "1",
      quizQuestion2Points: "1"
    });

    expect(definition).not.toBeNull();
    expect(definition?.questions).toHaveLength(2);
    expect(definition?.questions[0]).toMatchObject({
      id: "q1",
      correctOptionIndex: 1,
      points: 2
    });
    expect(definition?.questions[1]?.options).toEqual(["True", "False"]);

    const parsed = parseQuizDefinition(serializeQuizDefinition(definition!));
    expect(parsed).toEqual(definition);
  });

  it("scores quiz answers without trusting client-provided scores", () => {
    const definition = parseQuizDefinition(
      JSON.stringify({
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
      })
    );

    expect(definition).not.toBeNull();
    expect(getQuizMaxScore(definition!)).toBe(5);
    expect(scoreQuiz(definition!, { q1: 1, q2: 1 })).toMatchObject({
      score: 3,
      maxScore: 5
    });
  });

  it("clamps true/false correct answers to available options", () => {
    const definition = buildQuizDefinitionFromForm({
      quizQuestion1Type: "TRUE_FALSE",
      quizQuestion1Prompt: "True or false?",
      quizQuestion1CorrectOption: "4",
      quizQuestion1Points: "1"
    });

    expect(definition?.questions[0]).toMatchObject({
      options: ["True", "False"],
      correctOptionIndex: 1
    });
  });
});
