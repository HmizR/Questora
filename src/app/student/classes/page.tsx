import Link from "next/link";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function StudentClassesPage() {
  const user = await requireRole("STUDENT");

  const enrollments = await db.classStudent.findMany({
    where: { studentId: user.id, status: "ACTIVE" },
    include: {
      class: {
        include: {
          lecturer: true,
          modules: {
            where: { isPublished: true },
            include: { activities: { where: { isPublished: true } } }
          }
        }
      }
    },
    orderBy: { enrolledAt: "desc" }
  });

  return (
    <DashboardShell
      title="Learning realms"
      subtitle="Your active class enrollments and available missions."
    >
      <div className="grid gap-4">
        {enrollments.map((enrollment) => {
          const missionCount = enrollment.class.modules.reduce(
            (count, module) => count + module.activities.length,
            0
          );
          return (
            <Link
              className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:border-moss/60"
              href={`/student/classes/${enrollment.classId}`}
              key={enrollment.classId}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-moss">
                {enrollment.class.code}
              </p>
              <h2 className="mt-1 text-xl font-bold">{enrollment.class.name}</h2>
              <p className="mt-2 text-sm text-ink/65">
                Guide: {enrollment.class.lecturer.name} · {missionCount} available missions
              </p>
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}
