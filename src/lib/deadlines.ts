import { ActivityType, ProgressStatus } from "@prisma/client";

export const DUE_SOON_DAYS = 7;

export type DeadlineState = "overdue" | "due-today" | "due-soon" | "future" | "no-date";

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function classifyDeadline(
  dueAt: Date | null | undefined,
  now = new Date(),
  dueSoonDays = DUE_SOON_DAYS
): DeadlineState {
  if (!dueAt) return "no-date";
  if (dueAt.getTime() < now.getTime() && !isSameDay(dueAt, now)) return "overdue";
  if (isSameDay(dueAt, now)) return "due-today";
  if (dueAt.getTime() <= addDays(now, dueSoonDays).getTime()) return "due-soon";
  return "future";
}

export function isActivityFinishedForDeadline(input: {
  type: ActivityType;
  progressStatus?: ProgressStatus | null;
  hasSubmission?: boolean;
  hasPassedQuiz?: boolean;
}) {
  if (input.type === ActivityType.ASSIGNMENT || input.type === ActivityType.PROJECT) {
    return Boolean(input.hasSubmission);
  }

  if (input.type === ActivityType.QUIZ) {
    return Boolean(input.hasPassedQuiz);
  }

  return input.progressStatus === ProgressStatus.COMPLETED;
}

export function deadlineStateLabel(state: DeadlineState) {
  switch (state) {
    case "overdue":
      return "Overdue";
    case "due-today":
      return "Due today";
    case "due-soon":
      return "Due soon";
    case "future":
      return "Upcoming";
    default:
      return "No due date";
  }
}
