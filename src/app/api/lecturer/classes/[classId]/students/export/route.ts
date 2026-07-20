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

const rosterSorts = ["name", "xp", "level", "completed", "progress", "grades"] as const;
type RosterSort = (typeof rosterSorts)[number];

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
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = parseAnalyticsQuery<RosterSort>(searchParams, {
      defaultSort: "name",
      allowedSorts: rosterSorts
    });
    const teachingClass = await db.class.findUniqueOrThrow({
      where: { id: classId },
      include: {
        modules: {
          include: {
            activities: {
              where: { isPublished: true },
              include: { submissions: true, grades: true, quizAttempts: true }
            }
          }
        },
        students: {
          where: { status: "ACTIVE" },
          include: {
            student: {
              include: {
                profile: true,
                progresses: { where: { activity: { module: { classId } } } },
                grades: { where: { activity: { module: { classId } } } }
              }
            }
          }
        }
      }
    });
    const activities = teachingClass.modules.flatMap((module) => module.activities);
    const totalActivities = activities.length;
    const rows = teachingClass.students.map((entry) => {
      const completed = entry.student.progresses.filter(
        (progress) => progress.status === "COMPLETED"
      ).length;
      const percent = totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;
      const attentionCount = activities.filter((activity) => {
        const submission = activity.submissions.find((item) => item.studentId === entry.studentId);
        const grade = activity.grades.find((item) => item.studentId === entry.studentId);
        const attempts = activity.quizAttempts.filter((item) => item.studentId === entry.studentId);
        return missionNeedsAttention({
          type: activity.type,
          dueAt: activity.dueAt,
          hasSubmission: Boolean(submission),
          hasGrade: Boolean(grade),
          gradePublishedAt: grade?.publishedAt,
          attemptsUsed: attempts.length,
          maxAttempts: activity.maxAttempts,
          hasPassed: attempts.some((attempt) => attempt.passed)
        });
      }).length;
      return {
        entry,
        completed,
        percent,
        attentionCount,
        xp: entry.student.profile?.totalXp ?? 0,
        level: entry.student.profile?.level ?? 1,
        grades: entry.student.grades.length
      };
    });
    const filtered = rows.filter((row) => {
      if (!matchesSearch(row.entry.student, query.q)) return false;
      if (query.attention === "needs-attention" && row.attentionCount === 0) return false;
      return true;
    });
    const sorted = sortByDirection(filtered, query.dir, (row) => {
      switch (query.sort) {
        case "xp":
          return row.xp;
        case "level":
          return row.level;
        case "completed":
          return row.completed;
        case "progress":
          return row.percent;
        case "grades":
          return row.grades;
        default:
          return row.entry.student.name;
      }
    });

    return csvResponse(
      "student-roster.csv",
      toCsv([
        ["Student", "Email", "XP", "Level", "Completed missions", "Total missions", "Progress", "Grades", "Needs attention"],
        ...sorted.map((row) => [
          row.entry.student.name,
          row.entry.student.email,
          row.xp,
          row.level,
          row.completed,
          totalActivities,
          `${row.percent}%`,
          row.grades,
          row.attentionCount > 0 ? "Yes" : "No"
        ])
      ])
    );
  } catch (error) {
    return errorResponse(error);
  }
}
