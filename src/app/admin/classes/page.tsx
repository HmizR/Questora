import Link from "next/link";

import { AdminLinks } from "@/components/admin/admin-links";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireAdmin } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function AdminClassesPage() {
  await requireAdmin();

  const classes = await db.class.findMany({
    include: {
      lecturer: true,
      students: {
        where: { status: "ACTIVE" }
      }
    },
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });

  return (
    <DashboardShell
      title="Learning realms"
      subtitle="Create classes, assign lecturers, and manage student enrollment."
    >
      <AdminLinks />
      <div className="mb-5 flex justify-end">
        <Link
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel"
          href="/admin/classes/new"
        >
          New class
        </Link>
      </div>
      <div className="grid gap-4">
        {classes.map((teachingClass) => (
          <Link
            className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:border-moss/60"
            href={`/admin/classes/${teachingClass.id}`}
            key={teachingClass.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-moss">
                  {teachingClass.code}
                </p>
                <h2 className="mt-1 text-xl font-bold">{teachingClass.name}</h2>
                <p className="mt-2 text-sm text-ink/65">Lecturer: {teachingClass.lecturer.name}</p>
              </div>
              <div className="text-sm text-ink/65">
                {teachingClass.status} · {teachingClass.students.length} active students
              </div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
