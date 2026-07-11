import { ActivityType } from "@prisma/client";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
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
            {teachingClass.students.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-ink/65" colSpan={Math.max(missions.length + 1, 1)}>
                  No active students enrolled.
                </td>
              </tr>
            ) : missions.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-ink/65" colSpan={1}>
                  No gradable missions yet.
                </td>
              </tr>
            ) : (
              teachingClass.students.map((enrollment) => (
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
                          <span className="font-semibold text-ink">
                            {grade.score.toString()}
                            {!grade.publishedAt ? (
                              <span className="ml-2 rounded bg-parchment px-2 py-1 text-xs text-ink/65">
                                Draft
                              </span>
                            ) : null}
                          </span>
                        ) : submission ? (
                          <span className="text-ember">Ungraded</span>
                        ) : mission.type === ActivityType.ASSIGNMENT ||
                          mission.type === ActivityType.PROJECT ? (
                          <span className="text-ink/55">Not submitted</span>
                        ) : (
                          <span className="text-ink/55">No grade</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
