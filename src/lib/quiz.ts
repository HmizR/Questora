import { z } from "zod";

export const quizQuestionTypeSchema = z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]);

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  type: quizQuestionTypeSchema,
  prompt: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).min(2).max(4),
  correctOptionIndex: z.number().int().min(0),
  points: z.number().positive()
});

export const quizDefinitionSchema = z.object({
  version: z.literal(1),
  questions: z.array(quizQuestionSchema).min(1)
});

export const quizAnswersSchema = z.record(z.string().min(1), z.coerce.number().int().min(0));

export type QuizDefinition = z.infer<typeof quizDefinitionSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizAnswers = z.infer<typeof quizAnswersSchema>;

export type QuizFormInput = {
  [key: string]: unknown;
};

function textValue(input: QuizFormInput, key: string) {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(input: QuizFormInput, key: string) {
  const value = Number(textValue(input, key));
  return Number.isFinite(value) ? value : undefined;
}

export function buildQuizDefinitionFromForm(input: QuizFormInput): QuizDefinition | null {
  const questions: QuizQuestion[] = [];

  for (let index = 1; index <= 5; index += 1) {
    const prompt = textValue(input, `quizQuestion${index}Prompt`);
    if (!prompt) continue;

    const type =
      textValue(input, `quizQuestion${index}Type`) === "TRUE_FALSE"
        ? "TRUE_FALSE"
        : "MULTIPLE_CHOICE";
    const points = numberValue(input, `quizQuestion${index}Points`) ?? 1;

    const options =
      type === "TRUE_FALSE"
        ? ["True", "False"]
        : [1, 2, 3, 4]
            .map((optionIndex) => textValue(input, `quizQuestion${index}Option${optionIndex}`))
            .filter(Boolean);

    const correctOptionIndex = Math.max(
      0,
      Math.min(options.length - 1, (numberValue(input, `quizQuestion${index}CorrectOption`) ?? 1) - 1)
    );

    questions.push({
      id: `q${index}`,
      type,
      prompt,
      options,
      correctOptionIndex,
      points
    });
  }

  if (questions.length === 0) {
    return null;
  }

  return quizDefinitionSchema.parse({ version: 1, questions });
}

export function serializeQuizDefinition(definition: QuizDefinition) {
  return JSON.stringify(definition);
}

export function parseQuizDefinition(content?: string | null) {
  if (!content) {
    return null;
  }

  try {
    return quizDefinitionSchema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

export function getQuizMaxScore(definition: QuizDefinition) {
  return definition.questions.reduce((total, question) => total + question.points, 0);
}

export function scoreQuiz(definition: QuizDefinition, answers: QuizAnswers) {
  const results = definition.questions.map((question) => {
    const selectedOptionIndex = answers[question.id];
    const isCorrect = selectedOptionIndex === question.correctOptionIndex;

    return {
      questionId: question.id,
      selectedOptionIndex,
      correctOptionIndex: question.correctOptionIndex,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
      pointsPossible: question.points
    };
  });

  return {
    score: results.reduce((total, result) => total + result.pointsAwarded, 0),
    maxScore: getQuizMaxScore(definition),
    results
  };
}

export function getQuizQuestionFieldDefaults(content?: string | null) {
  const definition = parseQuizDefinition(content);
  return definition?.questions ?? [];
}
