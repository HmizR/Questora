import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerStudentsPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      modules: { include: { activities: true } },
      students: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            include: {
              profile: true,
              progresses: {
                where: { activity: { module: { classId } } }
              },
              grades: {
                where: { activity: { module: { classId } } }
              }
            }
          }
        },
        orderBy: { enrolledAt: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();

  const totalActivities = teachingClass.modules.reduce(
    (count, module) => count + module.activities.length,
    0
  );

  return (
    <DashboardShell title="Student roster" subtitle="View learner XP, progress, and grading status.">
      <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">XP</th>
              <th className="px-4 py-3 font-semibold">Level</th>
              <th className="px-4 py-3 font-semibold">Completed missions</th>
              <th className="px-4 py-3 font-semibold">Progress</th>
              <th className="px-4 py-3 font-semibold">Grades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {teachingClass.students.map((entry) => {
              const completed = entry.student.progresses.filter(
                (progress) => progress.status === "COMPLETED"
              ).length;
              const percent =
                totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;

              return (
                <tr key={entry.studentId}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{entry.student.name}</p>
                    <p className="text-xs text-ink/60">{entry.student.email}</p>
                  </td>
                  <td className="px-4 py-3">{entry.student.profile?.totalXp ?? 0}</td>
                  <td className="px-4 py-3">{entry.student.profile?.level ?? 1}</td>
                  <td className="px-4 py-3">
                    {completed}/{totalActivities}
                  </td>
                  <td className="px-4 py-3">{percent}%</td>
                  <td className="px-4 py-3">{entry.student.grades.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
