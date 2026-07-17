import { ActivityType } from "@prisma/client";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireClassLecturer } from "@/lib/authorization-service";
import { formatTimestampLabel } from "@/lib/date-format";
import { db } from "@/lib/db";

export default async function LecturerGradesPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        where: { status: "ACTIVE" },
        include: { student: true },
        orderBy: [{ student: { name: "asc" } }, { enrolledAt: "asc" }]
      },
      modules: {
        include: {
          activities: {
            where: { type: { not: ActivityType.LESSON } },
            include: {
              grades: true,
              submissions: true
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
      moduleTitle: learningModule.title
    }))
  );

  return (
    <DashboardShell title="Grades" subtitle="Review grade coverage across students and missions.">
      <ClassTabs classId={classId} role="LECTURER" />
      {teachingClass.students.length === 0 ? (
        <EmptyState
          description="Enroll students before grade coverage can appear."
          title="No active students enrolled"
        />
      ) : missions.length === 0 ? (
        <EmptyState
          actionHref={`/lecturer/classes/${classId}/modules`}
          actionLabel="Open regions"
          description="Assignments, projects, and quizzes will appear here after you add them."
          title="No gradable missions yet"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="sticky left-0 z-10 bg-ink px-4 py-3 font-semibold">Student</th>
              {missions.map((mission) => (
                <th className="min-w-44 px-4 py-3 font-semibold" key={mission.id}>
                  <span className="block">{mission.title}</span>
                  <span className="mt-1 block text-xs font-medium text-white/70">
                    {mission.moduleTitle} - {mission.type}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {teachingClass.students.map((enrollment) => (
                <tr key={enrollment.studentId}>
                  <th className="sticky left-0 bg-white px-4 py-3 font-semibold">
                    <span className="block">{enrollment.student.name}</span>
                    <span className="mt-1 block text-xs font-medium text-ink/55">
                      {enrollment.student.email}
                    </span>
                  </th>
                  {missions.map((mission) => {
                    const grade = mission.grades.find(
                      (entry) => entry.studentId === enrollment.studentId
                    );
                    const submission = mission.submissions.find(
                      (entry) => entry.studentId === enrollment.studentId
                    );

                    return (
                      <td className="px-4 py-3" key={mission.id}>
                        {grade ? (
                          <div
                            className="space-y-1"
                            title={
                              grade.publishedAt
                                ? formatTimestampLabel("Published", grade.publishedAt)
                                : grade.gradedAt
                                  ? formatTimestampLabel("Graded", grade.gradedAt)
                                  : undefined
                            }
                          >
                            <span className="block font-semibold text-ink">
                              {grade.score.toString()}
                            </span>
                            <StatusBadge tone={grade.publishedAt ? "success" : "info"}>
                              {grade.publishedAt ? "Published" : "Draft grade"}
                            </StatusBadge>
                            <span className="block text-xs text-ink/55">
                              {grade.publishedAt
                                ? formatTimestampLabel("Published", grade.publishedAt)
                                : grade.gradedAt
                                  ? formatTimestampLabel("Graded", grade.gradedAt)
                                  : "Graded"}
                            </span>
                          </div>
                        ) : submission ? (
                          <div className="space-y-1">
                            <StatusBadge tone="warning">Ungraded</StatusBadge>
                            {submission.submittedAt ? (
                              <span className="block text-xs text-ink/55">
                                {formatTimestampLabel("Submitted", submission.submittedAt)}
                              </span>
                            ) : null}
                          </div>
                        ) : mission.type === ActivityType.ASSIGNMENT ||
                          mission.type === ActivityType.PROJECT ? (
                          <StatusBadge>Not submitted</StatusBadge>
                        ) : (
                          <StatusBadge>No grade</StatusBadge>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}
    </DashboardShell>
  );
}
