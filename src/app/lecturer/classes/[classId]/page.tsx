import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { DeadlineCard } from "@/components/ui/deadline-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { getLecturerDeadlineItems, getLecturerOverdueWork } from "@/services/deadline-service";

export default async function LecturerClassDashboardPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { user } = await requireClassLecturer(classId);

  const [teachingClass, deadlines, overdueWork, announcements] = await Promise.all([
    db.class.findUnique({
    where: { id: classId },
    include: {
      students: { where: { status: "ACTIVE" }, include: { student: true } },
      modules: { include: { activities: true }, orderBy: { position: "asc" } },
      quests: { orderBy: { position: "asc" } },
      _count: { select: { quests: true, modules: true } }
    }
    }),
    getLecturerDeadlineItems({ lecturerId: user.id, classId }),
    getLecturerOverdueWork({ lecturerId: user.id, classId }),
    db.announcement.findMany({
      where: { classId, status: { in: ["DRAFT", "PUBLISHED"] } },
      orderBy: [{ updatedAt: "desc" }],
      take: 3
    })
  ]);

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
  const dueSoon = deadlines
    .filter((item) => item.state === "due-today" || item.state === "due-soon")
    .slice(0, 5);
  const overdue = overdueWork.slice(0, 5);

  return (
    <DashboardShell
      title={`${teachingClass.name} overview`}
      subtitle={teachingClass.description ?? "Realm overview"}
    >
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={teachingClass.students.length} />
        <StatCard label="Regions" value={teachingClass._count.modules} />
        <StatCard label="Quests" value={teachingClass._count.quests} />
        <StatCard label="Completed missions" value={completedProgress} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Upcoming deadlines</h2>
          <div className="mt-4 grid gap-3">
            {dueSoon.length === 0 ? (
              <p className="text-sm text-ink/65">No published missions are due in the next 7 days.</p>
            ) : (
              dueSoon.map((item) => (
                <DeadlineCard
                  context={item.moduleTitle}
                  dueAt={item.dueAt}
                  href={item.href}
                  key={item.activityId}
                  meta={item.type}
                  state={item.state}
                  title={item.title}
                />
              ))
            )}
          </div>
        </section>
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Overdue work</h2>
          <div className="mt-4 grid gap-3">
            {overdue.length === 0 ? (
              <p className="text-sm text-ink/65">No overdue submissions or quizzes need attention.</p>
            ) : (
              overdue.map((item) => (
                <DeadlineCard
                  context={`${item.studentName} - ${item.moduleTitle}`}
                  dueAt={item.dueAt}
                  href={item.href}
                  key={`${item.activityId}-${item.studentId}`}
                  meta={item.reason === "missing-submission" ? "Missing submission" : "Quiz not passed"}
                  state={item.state}
                  title={item.title}
                />
              ))
            )}
          </div>
        </section>
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Recent announcements</h2>
            <Link
              className="text-sm font-semibold text-moss hover:text-ink"
              href={`/lecturer/classes/${classId}/announcements`}
            >
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {announcements.length === 0 ? (
              <p className="text-sm text-ink/65">No draft or published announcements yet.</p>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="border-b border-ink/10 pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold" title={announcement.title}>
                      {announcement.title}
                    </p>
                    <StatusBadge tone={announcement.status === "PUBLISHED" ? "success" : "warning"}>
                      {announcement.status === "PUBLISHED" ? "Published" : "Draft"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/60">{announcement.body}</p>
                </div>
              ))
            )}
          </div>
        </section>
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
