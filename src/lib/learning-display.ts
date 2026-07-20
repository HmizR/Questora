import type { SubmissionStatus } from "@prisma/client";

export function submissionActionLabel(status: SubmissionStatus | null | undefined) {
  return status ? "Update submission" : "Submit assignment";
}

export function submissionSummaryLabel(status: SubmissionStatus | null | undefined) {
  if (!status) return "Not submitted";
  if (status === "GRADED") return "Graded, locked";
  if (status === "RETURNED") return "Returned, editable";
  return "Submitted, editable until graded";
}

export function quizAttemptLimitLabel(input: {
  attemptsUsed: number;
  maxAttempts: number | null | undefined;
  remainingAttempts: number | null;
}) {
  if (!input.maxAttempts) {
    return `${input.attemptsUsed} / unlimited attempts used`;
  }

  return `${input.attemptsUsed} / ${input.maxAttempts} attempts used (${input.remainingAttempts ?? 0} remaining)`;
}
