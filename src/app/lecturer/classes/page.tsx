import Link from "next/link";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerClassesPage() {
  const user = await requireRole("LECTURER");

  const classes = await db.class.findMany({
    where: { lecturerId: user.id },
    include: {
      students: { where: { status: "ACTIVE" } },
      modules: true,
      quests: true
    },
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });

  return (
    <DashboardShell
      title="Assigned learning realms"
      subtitle="Only realms assigned to you appear here."
    >
      <div className="grid gap-4">
        {classes.map((teachingClass) => (
          <Link
            className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:border-moss/60"
            href={`/lecturer/classes/${teachingClass.id}`}
            key={teachingClass.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-moss">
                  {teachingClass.code}
                </p>
                <h2 className="mt-1 text-xl font-bold">{teachingClass.name}</h2>
                <p className="mt-2 text-sm text-ink/65">{teachingClass.description}</p>
              </div>
              <div className="text-sm text-ink/65">
                {teachingClass.status} · {teachingClass.students.length} students ·{" "}
                {teachingClass.modules.length} regions · {teachingClass.quests.length} quests
              </div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
