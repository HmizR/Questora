import { ActivityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authorization-service";
import { AppError, toActionError } from "@/lib/errors";
import {
  matchesSearch,
  missionNeedsAttention,
  parseAnalyticsQuery,
  sortByDirection,
  toCsv
} from "@/lib/lecturer-analytics";
import { getLecturerQuizAnalytics } from "@/services/quiz-analytics-service";

const quizSorts = ["name", "attempts", "best", "latest", "last-attempted"] as const;
const quizStatuses = ["passed", "not-passed", "not-started"] as const;
type QuizSort = (typeof quizSorts)[number];
type QuizStatus = (typeof quizStatuses)[number];

function csvResponse(fileName: string, csv: string) {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}

function errorResponse(error: unknown) {
  const actionError = toActionError(error);
  const status =
    actionError.code === "AUTHENTICATION_REQUIRED"
      ? 401
      : actionError.code === "FORBIDDEN"
        ? 403
        : actionError.code === "NOT_FOUND"
          ? 404
          : 400;
  return NextResponse.json({ error: actionError }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; moduleId: string; activityId: string }> }
) {
  try {
    const { classId, moduleId, activityId } = await params;
    const user = await requireRole("LECTURER");
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = parseAnalyticsQuery<QuizSort, QuizStatus>(searchParams, {
      defaultSort: "name",
      allowedSorts: quizSorts,
      allowedStatuses: quizStatuses
    });
    const data = await getLecturerQuizAnalytics({
      lecturerId: user.id,
      classId,
      moduleId,
      activityId
    });
    if (data.activity.type !== ActivityType.QUIZ) {
      throw new AppError("BAD_REQUEST", "Quiz exports are only available for quiz missions.");
    }
    const rows = data.studentRows.map((row) => {
      const needsAttention = missionNeedsAttention({
        type: data.activity.type,
        dueAt: data.activity.dueAt,
        attemptsUsed: row.attemptsUsed,
        maxAttempts: data.activity.maxAttempts,
        hasPassed: row.hasPassed
      });
      const status = row.hasPassed ? "passed" : row.attemptsUsed > 0 ? "not-passed" : "not-started";
      return { ...row, needsAttention, status };
    });
    const filtered = rows.filter((row) => {
      if (!matchesSearch({ name: row.studentName, email: row.studentEmail }, query.q)) return false;
      if (query.status !== "all" && row.status !== query.status) return false;
      if (query.attention === "needs-attention" && !row.needsAttention) return false;
      return true;
    });
    const sorted = sortByDirection(filtered, query.dir, (row) => {
      switch (query.sort) {
        case "attempts":
          return row.attemptsUsed;
        case "best":
          return row.bestAttempt ? Number(row.bestAttempt.score) : -1;
        case "latest":
          return row.latestAttempt ? Number(row.latestAttempt.score) : -1;
        case "last-attempted":
          return row.latestAttempt?.submittedAt ?? null;
        default:
          return row.studentName;
      }
    });
    return csvResponse(
      "quiz-analytics.csv",
      toCsv([
        ["Student", "Email", "Attempts Used", "Best Score", "Latest Score", "Status", "Last Attempted", "Needs Attention"],
        ...sorted.map((row) => [
          row.studentName,
          row.studentEmail,
          row.attemptsUsed,
          row.bestAttempt ? `${row.bestAttempt.score.toString()} / ${row.bestAttempt.maxScore.toString()}` : "",
          row.latestAttempt ? `${row.latestAttempt.score.toString()} / ${row.latestAttempt.maxScore.toString()}` : "",
          row.status,
          row.latestAttempt?.submittedAt ?? "",
          row.needsAttention ? "Yes" : "No"
        ])
      ])
    );
  } catch (error) {
    return errorResponse(error);
  }
}
