import { ActivityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { AppError, toActionError } from "@/lib/errors";
import {
  matchesSearch,
  missionNeedsAttention,
  parseAnalyticsQuery,
  sortByDirection,
  toCsv
} from "@/lib/lecturer-analytics";

const submissionSorts = ["name", "submitted", "grade", "score"] as const;
const submissionStatuses = ["submitted", "not-submitted", "ungraded", "returned", "draft", "published"] as const;
type SubmissionSort = (typeof submissionSorts)[number];
type SubmissionStatusFilter = (typeof submissionStatuses)[number];

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
    await requireClassLecturer(classId);
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = parseAnalyticsQuery<SubmissionSort, SubmissionStatusFilter>(searchParams, {
      defaultSort: "name",
      allowedSorts: submissionSorts,
      allowedStatuses: submissionStatuses
    });
    const activity = await db.activity.findFirst({
      where: { id: activityId, moduleId, module: { classId } }
    });
    if (!activity) throw new AppError("NOT_FOUND", "Mission not found.");
    if (activity.type !== ActivityType.ASSIGNMENT && activity.type !== ActivityType.PROJECT) {
      throw new AppError("BAD_REQUEST", "Submission exports are only available for assignments and projects.");
    }
    const enrollments = await db.classStudent.findMany({
      where: { classId, status: "ACTIVE" },
      include: {
        student: {
          include: {
            submissions: { where: { activityId }, take: 1 },
            grades: { where: { activityId }, take: 1 }
          }
        }
      }
    });
    const rows = enrollments.map((enrollment) => {
      const submission = enrollment.student.submissions[0];
      const grade = enrollment.student.grades[0];
      const state =
        submission?.status === "RETURNED"
          ? "returned"
          : grade?.publishedAt
            ? "published"
            : grade
              ? "draft"
              : submission
                ? "ungraded"
                : "not-submitted";
      const needsAttention = missionNeedsAttention({
        type: activity.type,
        dueAt: activity.dueAt,
        hasSubmission: Boolean(submission),
        hasGrade: Boolean(grade),
        gradePublishedAt: grade?.publishedAt
      });
      return { enrollment, submission, grade, state, needsAttention };
    });
    const filtered = rows.filter((row) => {
      if (!matchesSearch(row.enrollment.student, query.q)) return false;
      if (query.status === "submitted" && !row.submission) return false;
      if (query.status !== "all" && query.status !== "submitted" && row.state !== query.status) return false;
      if (query.attention === "needs-attention" && !row.needsAttention) return false;
      return true;
    });
    const sorted = sortByDirection(filtered, query.dir, (row) => {
      switch (query.sort) {
        case "submitted":
          return row.submission?.submittedAt ?? null;
        case "grade":
          return row.state;
        case "score":
          return row.grade ? Number(row.grade.score) : -1;
        default:
          return row.enrollment.student.name;
      }
    });
    return csvResponse(
      "mission-submissions.csv",
      toCsv([
        ["Student", "Email", "Submission State", "Submitted At", "Grade State", "Score", "Published At", "Needs Attention"],
        ...sorted.map((row) => [
          row.enrollment.student.name,
          row.enrollment.student.email,
          row.submission ? row.submission.status : "NOT_SUBMITTED",
          row.submission?.submittedAt ?? "",
          row.state,
          row.grade?.score.toString() ?? "",
          row.grade?.publishedAt ?? "",
          row.needsAttention ? "Yes" : "No"
        ])
      ])
    );
  } catch (error) {
    return errorResponse(error);
  }
}
