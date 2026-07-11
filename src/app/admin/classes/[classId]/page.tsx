import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  EnrollStudentForm,
  RemoveStudentForm,
  UpdateClassForm
} from "@/components/admin/class-form";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function AdminClassDetailPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  await requireAdmin();
  const { classId } = await params;

  const [teachingClass, lecturers, students] = await Promise.all([
    db.class.findUnique({
      where: { id: classId },
      include: {
        lecturer: true,
        modules: true,
        quests: true,
        students: {
          include: { student: true },
          orderBy: { enrolledAt: "desc" }
        }
      }
    }),
    db.user.findMany({
      where: { role: UserRole.LECTURER, status: "ACTIVE" },
      orderBy: { name: "asc" }
    }),
    db.user.findMany({
      where: { role: UserRole.STUDENT, status: "ACTIVE" },
      orderBy: { name: "asc" }
    })
  ]);

  if (!teachingClass) {
    notFound();
  }

  const activeEnrollments = teachingClass.students.filter((entry) => entry.status === "ACTIVE");
  const activeStudentIds = new Set(activeEnrollments.map((entry) => entry.studentId));
  const availableStudents = students.filter((student) => !activeStudentIds.has(student.id));

  return (
    <DashboardShell
      title={teachingClass.name}
      subtitle="Update class details, assign the lecturer, and manage the active student roster."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active students" value={activeEnrollments.length} />
        <StatCard label="Regions" value={teachingClass.modules.length} />
        <StatCard label="Quests" value={teachingClass.quests.length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <UpdateClassForm teachingClass={teachingClass} lecturers={lecturers} />
        <div className="space-y-6">
          <EnrollStudentForm classId={teachingClass.id} students={availableStudents} />
          <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Active students</h2>
            <div className="mt-4 space-y-3">
              {activeEnrollments.length === 0 ? (
                <p className="text-sm text-ink/65">No active students enrolled.</p>
              ) : (
                activeEnrollments.map((entry) => (
                  <div className="flex items-center justify-between gap-3" key={entry.studentId}>
                    <div>
                      <p className="text-sm font-semibold">{entry.student.name}</p>
                      <p className="text-xs text-ink/60">{entry.student.email}</p>
                    </div>
                    <RemoveStudentForm classId={teachingClass.id} studentId={entry.studentId} />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
