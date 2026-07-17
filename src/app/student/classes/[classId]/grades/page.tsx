import { ActivityType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { db } from "@/lib/db";

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "No date";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "No timestamp";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default async function StudentClassGradesPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { user } = await requireClassEnrollment(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      modules: {
        where: { isPublished: true },
        include: {
          activities: {
            where: {
              isPublished: true,
              type: { not: ActivityType.LESSON }
            },
            include: {
              grades: {
                where: {
                  studentId: user.id,
                  publishedAt: { not: null }
                }
              },
              quizAttempts: {
                where: { studentId: user.id },
                orderBy: [{ score: "desc" }, { attemptNo: "desc" }]
              },
              submissions: {
                where: { studentId: user.id }
              }
            },
            orderBy: { position: "asc" }
          }
        },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();

  const missions = teachingClass.modules.flatMap((learningModule) =>
    learningModule.activities.map((activity) => ({
      ...activity,
      regionTitle: learningModule.title
    }))
  );

  return (
    <DashboardShell
      title={`${teachingClass.name} grades`}
      subtitle="Review your published scores, feedback, and submission status for this realm."
    >
      <ClassTabs classId={classId} role="STUDENT" />

      {missions.length === 0 ? (
        <EmptyState
          description="Published assignments, projects, and quizzes will appear here once your lecturer adds them."
          title="No graded missions yet"
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-ink text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Mission</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Due date</th>
                <th className="px-4 py-3 font-semibold">Submission</th>
                <th className="px-4 py-3 font-semibold">Grade</th>
                <th className="px-4 py-3 font-semibold">Feedback</th>
                <th className="px-4 py-3 font-semibold">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {missions.map((mission) => {
                const grade = mission.grades[0];
                const submission = mission.submissions[0];
                const bestAttempt = mission.quizAttempts[0];
                const isQuiz = mission.type === ActivityType.QUIZ;
                const submissionStatus = isQuiz
                  ? bestAttempt
                    ? `${mission.quizAttempts.length} attempt${
                        mission.quizAttempts.length === 1 ? "" : "s"
                      }, best ${bestAttempt.score.toString()} / ${bestAttempt.maxScore.toString()}`
                    : "No attempts yet"
                  : submission
                    ? `${submission.status} ${submission.submittedAt ? `on ${formatDateTime(submission.submittedAt)}` : ""}`
                    : "Not submitted";

                return (
                  <tr className="align-top" key={mission.id}>
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-ink hover:text-moss hover:underline"
                        href={`/student/classes/${classId}/activities/${mission.id}`}
                      >
                        {mission.title}
                      </Link>
                      <p className="mt-1 text-xs text-ink/55">{mission.regionTitle}</p>
                    </td>
                    <td className="px-4 py-3">{mission.type}</td>
                    <td className="px-4 py-3">{formatDate(mission.dueAt)}</td>
                    <td className="px-4 py-3 text-ink/70">{submissionStatus}</td>
                    <td className="px-4 py-3 font-semibold">
                      {grade ? (
                        <>
                          {grade.score.toString()}
                          {mission.maxScore ? ` / ${mission.maxScore.toString()}` : ""}
                        </>
                      ) : (
                        <span className="font-normal text-ink/55">Not published</span>
                      )}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-ink/70">
                      {grade?.feedback ? grade.feedback : "No feedback yet"}
                    </td>
                    <td className="px-4 py-3 text-ink/70">{formatDate(grade?.publishedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
