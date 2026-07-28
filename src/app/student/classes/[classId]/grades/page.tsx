import { ActivityType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { activityTypeLabel } from "@/components/ui/mission-display";
import { RubricBreakdown } from "@/components/ui/rubric-breakdown";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { formatDate, formatDateTime, formatTimestampLabel } from "@/lib/date-format";
import { db } from "@/lib/db";
import { readableStatus } from "@/lib/status-label";

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
                },
                include: {
                  rubricAssessment: {
                    include: {
                      scores: {
                        include: { criterion: true }
                      }
                    }
                  }
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
                    <td className="px-4 py-3">{activityTypeLabel(mission.type)}</td>
                    <td className="px-4 py-3">{formatDate(mission.dueAt)}</td>
                    <td className="px-4 py-3 text-ink/70">
                      {isQuiz ? (
                        bestAttempt ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone={bestAttempt.passed ? "success" : "warning"}>
                                {bestAttempt.passed ? "Passed" : "Not passed"}
                              </StatusBadge>
                              <span>
                                {mission.quizAttempts.length} attempt
                                {mission.quizAttempts.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            <span className="block text-xs text-ink/55">
                              Best {bestAttempt.score.toString()} / {bestAttempt.maxScore.toString()}
                            </span>
                          </div>
                        ) : (
                          <StatusBadge>No attempts yet</StatusBadge>
                        )
                      ) : submission ? (
                        <div className="space-y-1">
                          <StatusBadge tone="success">{readableStatus(submission.status)}</StatusBadge>
                          {submission.submittedAt ? (
                            <span className="block text-xs text-ink/55">
                              {formatTimestampLabel("Submitted", submission.submittedAt)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <StatusBadge>Not submitted</StatusBadge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {grade ? (
                        <div className="space-y-1">
                          <span className="block">
                            {grade.score.toString()}
                            {mission.maxScore ? ` / ${mission.maxScore.toString()}` : ""}
                          </span>
                          <StatusBadge tone="success">Published</StatusBadge>
                        </div>
                      ) : (
                        <StatusBadge>Not published</StatusBadge>
                      )}
                    </td>
                    <td className="max-w-[340px] px-4 py-3 text-ink/70">
                      <div className="space-y-3">
                        <p>{grade?.feedback ? grade.feedback : "No feedback yet"}</p>
                        {grade?.rubricAssessment ? (
                          <RubricBreakdown
                            assessment={grade.rubricAssessment}
                            title="Rubric"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {grade?.publishedAt ? formatDateTime(grade.publishedAt) : "Not published"}
                    </td>
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
