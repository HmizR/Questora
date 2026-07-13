"use client";

import { useState } from "react";

import { SelectField, TextField } from "@/components/admin/form-fields";
import type { QuizQuestion } from "@/lib/quiz";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";

function initialType(question?: QuizQuestion): QuestionType {
  return question?.type === "TRUE_FALSE" ? "TRUE_FALSE" : "MULTIPLE_CHOICE";
}

export function QuizBuilderFields({ questions = [] }: { questions?: QuizQuestion[] }) {
  const [types, setTypes] = useState<Record<number, QuestionType>>(() =>
    Object.fromEntries([1, 2, 3, 4, 5].map((index) => [index, initialType(questions[index - 1])]))
  );

  return (
    <details className="rounded-lg border border-border/80 bg-surface-muted p-4" open={questions.length > 0}>
      <summary className="cursor-pointer list-none text-sm font-bold">
        Quiz questions
        <span className="ml-2 text-xs font-medium text-ink/55">
          For QUIZ missions only. Leave blank for other mission types.
        </span>
      </summary>
      <div className="mt-4 space-y-4">
        {[1, 2, 3, 4, 5].map((index) => {
          const question = questions[index - 1];
          const type = types[index] ?? "MULTIPLE_CHOICE";
          const correctOption = question ? String(question.correctOptionIndex + 1) : "1";
          const optionCount = type === "TRUE_FALSE" ? 2 : 4;

          return (
            <div className="rounded-lg border border-border/80 bg-surface p-4" key={index}>
              <div className="grid gap-4 md:grid-cols-[160px_1fr_120px]">
                <label className="block text-sm font-medium text-ink">
                  Q{index} type
                  <select
                    className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 outline-none ring-moss/40 focus:ring-4"
                    name={`quizQuestion${index}Type`}
                    value={type}
                    onChange={(event) =>
                      setTypes((current) => ({
                        ...current,
                        [index]: event.target.value as QuestionType
                      }))
                    }
                  >
                    <option value="MULTIPLE_CHOICE">Multiple choice</option>
                    <option value="TRUE_FALSE">True / false</option>
                  </select>
                </label>
                <TextField
                  label="Prompt"
                  name={`quizQuestion${index}Prompt`}
                  defaultValue={question?.prompt}
                  required={false}
                />
                <TextField
                  label="Points"
                  name={`quizQuestion${index}Points`}
                  type="number"
                  defaultValue={String(question?.points ?? 1)}
                  required={false}
                />
              </div>
              {type === "TRUE_FALSE" ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input name={`quizQuestion${index}Option1`} type="hidden" value="True" />
                  <input name={`quizQuestion${index}Option2`} type="hidden" value="False" />
                  <div className="rounded-md border border-border/80 bg-surface-muted px-3 py-2 text-sm">
                    Option 1: True
                  </div>
                  <div className="rounded-md border border-border/80 bg-surface-muted px-3 py-2 text-sm">
                    Option 2: False
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((optionIndex) => (
                    <TextField
                      key={optionIndex}
                      label={`Option ${optionIndex}`}
                      name={`quizQuestion${index}Option${optionIndex}`}
                      defaultValue={question?.options[optionIndex - 1]}
                      required={false}
                    />
                  ))}
                </div>
              )}
              <div className="mt-4 max-w-48">
                <SelectField
                  label="Correct option"
                  name={`quizQuestion${index}CorrectOption`}
                  defaultValue={Number(correctOption) > optionCount ? "1" : correctOption}
                  options={Array.from({ length: optionCount }, (_, optionIndex) => ({
                    value: String(optionIndex + 1),
                    label: type === "TRUE_FALSE" ? (optionIndex === 0 ? "True" : "False") : `Option ${optionIndex + 1}`
                  }))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
