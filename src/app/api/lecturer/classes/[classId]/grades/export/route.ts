import { ActivityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { toActionError } from "@/lib/errors";
import {
  matchesSearch,
  missionNeedsAttention,
  parseAnalyticsQuery,
  sortByDirection,
  toCsv
} from "@/lib/lecturer-analytics";

const gradeSorts = ["name", "published", "draft", "ungraded", "not-submitted"] as const;
const gradeStatuses = ["published", "draft", "ungraded", "not-submitted", "no-grade"] as const;
const missionTypes = ["all", ActivityType.ASSIGNMENT, ActivityType.PROJECT, ActivityType.QUIZ] as const;
type GradeSort = (typeof gradeSorts)[number];
type GradeStatus = (typeof gradeStatuses)[number];

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
        : 400;
  return NextResponse.json({ error: actionError }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    await requireClassLecturer(classId);
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = parseAnalyticsQuery<GradeSort, GradeStatus>(searchParams, {
      defaultSort: "name",
      allowedSorts: gradeSorts,
      allowedStatuses: gradeStatuses
    });
    const rawType = url.searchParams.get("type") ?? "all";
    const typeFilter = missionTypes.includes(rawType as (typeof missionTypes)[number])
      ? (rawType as (typeof missionTypes)[number])
      : "all";
    const teachingClass = await db.class.findUniqueOrThrow({
      where: { id: classId },
      include: {
        students: { where: { status: "ACTIVE" }, include: { student: true } },
        modules: {
          include: {
            activities: {
              where: { type: { not: ActivityType.LESSON } },
              include: { grades: true, submissions: true },
              orderBy: { position: "asc" }
            }
          },
          orderBy: { position: "asc" }
        }
      }
    });
    const missions = teachingClass.modules
      .flatMap((module) => module.activities.map((activity) => ({ ...activity, moduleTitle: module.title })))
      .filter((mission) => typeFilter === "all" || mission.type === typeFilter);
    const stateFor = (mission: (typeof missions)[number], studentId: string) => {
      const grade = mission.grades.find((entry) => entry.studentId === studentId);
      const submission = mission.submissions.find((entry) => entry.studentId === studentId);
      if (grade?.publishedAt) return "published";
      if (grade) return "draft";
      if (submission) return "ungraded";
      if (mission.type === ActivityType.ASSIGNMENT || mission.type === ActivityType.PROJECT) return "not-submitted";
      return "no-grade";
    };
    const rows = teachingClass.students.map((enrollment) => {
      const counts = { published: 0, draft: 0, ungraded: 0, "not-submitted": 0, "no-grade": 0, attention: 0 };
      for (const mission of missions) {
        const state = stateFor(mission, enrollment.studentId);
        counts[state] += 1;
        const grade = mission.grades.find((entry) => entry.studentId === enrollment.studentId);
        const submission = mission.submissions.find((entry) => entry.studentId === enrollment.studentId);
        if (missionNeedsAttention({ type: mission.type, dueAt: mission.dueAt, hasSubmission: Boolean(submission), hasGrade: Boolean(grade), gradePublishedAt: grade?.publishedAt })) {
          counts.attention += 1;
        }
      }
      return { enrollment, counts };
    });
    const filtered = rows.filter(({ enrollment, counts }) => {
      if (!matchesSearch(enrollment.student, query.q)) return false;
      if (query.status !== "all" && counts[query.status] === 0) return false;
      if (query.attention === "needs-attention" && counts.attention === 0) return false;
      return true;
    });
    const sorted = sortByDirection(filtered, query.dir, (row) =>
      query.sort === "name" ? row.enrollment.student.name : row.counts[query.sort]
    );
    const csvRows: Array<Array<string | number | Date | null | undefined>> = [
      ["Student", "Email", "Mission", "Type", "State", "Score", "Published At", "Needs Attention"]
    ];
    for (const row of sorted) {
      for (const mission of missions) {
        const grade = mission.grades.find((entry) => entry.studentId === row.enrollment.studentId);
        const submission = mission.submissions.find((entry) => entry.studentId === row.enrollment.studentId);
        const needsAttention = missionNeedsAttention({ type: mission.type, dueAt: mission.dueAt, hasSubmission: Boolean(submission), hasGrade: Boolean(grade), gradePublishedAt: grade?.publishedAt });
        csvRows.push([
          row.enrollment.student.name,
          row.enrollment.student.email,
          mission.title,
          mission.type,
          stateFor(mission, row.enrollment.studentId),
          grade?.score.toString() ?? "",
          grade?.publishedAt ?? "",
          needsAttention ? "Yes" : "No"
        ]);
      }
    }
    return csvResponse("grades.csv", toCsv(csvRows));
  } catch (error) {
    return errorResponse(error);
  }
}
