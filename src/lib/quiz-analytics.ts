import type { QuizDefinition, QuizQuestion } from "@/lib/quiz";

type NumericLike = number | { toString(): string };

export type StoredQuizAttempt = {
  id?: string;
  studentId: string;
  attemptNo: number;
  answers: unknown;
  score: NumericLike;
  maxScore: NumericLike;
  passed: boolean;
  submittedAt: Date;
};

export type StoredQuizResult = {
  questionId: string;
  selectedOptionIndex?: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  pointsAwarded: number;
  pointsPossible: number;
};

export type ParsedQuizAttempt = StoredQuizAttempt & {
  selected: Record<string, number>;
  results: StoredQuizResult[];
};

function toNumber(value: NumericLike) {
  return typeof value === "number" ? value : Number(value.toString());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSelected(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, selected]) => [key, Number(selected)] as const)
      .filter(([, selected]) => Number.isInteger(selected))
  );
}

function parseResults(value: unknown): StoredQuizResult[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const questionId = typeof entry.questionId === "string" ? entry.questionId : "";
    const correctOptionIndex = Number(entry.correctOptionIndex);
    const selectedOptionIndex = Number(entry.selectedOptionIndex);
    const pointsAwarded = Number(entry.pointsAwarded);
    const pointsPossible = Number(entry.pointsPossible);

    if (!questionId || !Number.isInteger(correctOptionIndex)) {
      return [];
    }

    return {
      questionId,
      selectedOptionIndex: Number.isInteger(selectedOptionIndex) ? selectedOptionIndex : undefined,
      correctOptionIndex,
      isCorrect: Boolean(entry.isCorrect),
      pointsAwarded: Number.isFinite(pointsAwarded) ? pointsAwarded : 0,
      pointsPossible: Number.isFinite(pointsPossible) ? pointsPossible : 0
    };
  });
}

export function parseStoredQuizAttempt(attempt: StoredQuizAttempt): ParsedQuizAttempt {
  const answers = isRecord(attempt.answers) ? attempt.answers : {};

  return {
    ...attempt,
    selected: parseSelected(answers.selected),
    results: parseResults(answers.results)
  };
}

function selectedIndexForQuestion(attempt: ParsedQuizAttempt, question: QuizQuestion) {
  const result = attempt.results.find((entry) => entry.questionId === question.id);
  return result?.selectedOptionIndex ?? attempt.selected[question.id];
}

export function canRevealQuizCorrectAnswers(input: {
  hasPassed: boolean;
  remainingAttempts: number | null;
}) {
  return input.hasPassed || input.remainingAttempts === 0;
}

export function calculateQuizAnalytics(input: {
  definition: QuizDefinition;
  attempts: StoredQuizAttempt[];
  totalStudents: number;
}) {
  const attempts = input.attempts.map(parseStoredQuizAttempt);
  const participants = new Set(attempts.map((attempt) => attempt.studentId));
  const studentsWithPassingAttempt = new Set(
    attempts.filter((attempt) => attempt.passed).map((attempt) => attempt.studentId)
  );
  const scores = attempts.map((attempt) => toNumber(attempt.score));
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const averageScore =
    scores.length > 0
      ? scores.reduce((total, score) => total + score, 0) / scores.length
      : 0;
  const passRate =
    participants.size > 0 ? (studentsWithPassingAttempt.size / participants.size) * 100 : 0;
  const completionRate =
    input.totalStudents > 0 ? (participants.size / input.totalStudents) * 100 : 0;

  const questionBreakdown = input.definition.questions.map((question) => {
    const optionCounts = question.options.map((option, optionIndex) => ({
      option,
      optionIndex,
      count: 0
    }));
    let correctResponses = 0;
    let totalResponses = 0;

    for (const attempt of attempts) {
      const selectedOptionIndex = selectedIndexForQuestion(attempt, question);
      if (selectedOptionIndex === undefined) {
        continue;
      }

      totalResponses += 1;
      optionCounts[selectedOptionIndex] = {
        ...optionCounts[selectedOptionIndex],
        count: (optionCounts[selectedOptionIndex]?.count ?? 0) + 1
      };

      const result = attempt.results.find((entry) => entry.questionId === question.id);
      if (result?.isCorrect ?? selectedOptionIndex === question.correctOptionIndex) {
        correctResponses += 1;
      }
    }

    return {
      questionId: question.id,
      prompt: question.prompt,
      points: question.points,
      correctOptionIndex: question.correctOptionIndex,
      correctAnswer: question.options[question.correctOptionIndex] ?? "Unknown",
      totalResponses,
      correctResponses,
      correctRate: totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0,
      optionCounts
    };
  });

  return {
    attemptCount: attempts.length,
    participantCount: participants.size,
    averageScore,
    bestScore,
    passRate,
    completionRate,
    questionBreakdown
  };
}
