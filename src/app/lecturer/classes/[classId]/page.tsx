import { notFound } from "next/navigation";

import { LecturerLinks } from "@/components/lecturer/lecturer-links";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerClassDashboardPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      students: { where: { status: "ACTIVE" }, include: { student: true } },
      modules: { include: { activities: true }, orderBy: { position: "asc" } },
      quests: { orderBy: { position: "asc" } },
      _count: { select: { quests: true, modules: true } }
    }
  });

  if (!teachingClass) notFound();

  const submissions = await db.submission.findMany({
    where: { activity: { module: { classId } } },
    include: { activity: true, student: true },
    orderBy: { updatedAt: "desc" },
    take: 5
  });

  const completedProgress = await db.activityProgress.count({
    where: {
      status: "COMPLETED",
      activity: { module: { classId } }
    }
  });

  return (
    <DashboardShell title={teachingClass.name} subtitle={teachingClass.description ?? "Realm overview"}>
      <LecturerLinks classId={classId} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={teachingClass.students.length} />
        <StatCard label="Regions" value={teachingClass._count.modules} />
        <StatCard label="Quests" value={teachingClass._count.quests} />
        <StatCard label="Completed missions" value={completedProgress} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Regions and missions</h2>
          <div className="mt-4 space-y-4">
            {teachingClass.modules.map((module) => (
              <div key={module.id} className="border-b border-ink/10 pb-3 last:border-0">
                <p className="font-semibold">
                  {module.position}. {module.title}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {module.activities.length} missions · {module.isPublished ? "Published" : "Draft"}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Recent submissions</h2>
          <div className="mt-4 space-y-4">
            {submissions.length === 0 ? (
              <p className="text-sm text-ink/65">No submissions yet.</p>
            ) : (
              submissions.map((submission) => (
                <div key={submission.id} className="border-b border-ink/10 pb-3 last:border-0">
                  <p className="font-semibold">{submission.activity.title}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {submission.student.name} · {submission.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
