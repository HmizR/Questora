import Link from "next/link";
import { notFound } from "next/navigation";

import { AIAssistantContextRegistration } from "@/components/ai/ai-assistant-context-registration";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { DeadlineBadge, DeadlineCard } from "@/components/ui/deadline-card";
import { Expander } from "@/components/ui/expander";
import { MissionTypeIcon, ProgressStatusBadge } from "@/components/ui/mission-display";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { classifyDeadline } from "@/lib/deadlines";
import { db } from "@/lib/db";
import { getPublishedAnnouncementsForStudent } from "@/services/announcement-service";
import { getStudentDeadlineItems } from "@/services/deadline-service";

export default async function StudentClassPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { user } = await requireClassEnrollment(classId);

  const [teachingClass, deadlines, announcements] = await Promise.all([
    db.class.findUnique({
    where: { id: classId },
    include: {
      modules: {
        where: {
          isPublished: true,
          OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }]
        },
        include: {
          activities: {
            where: { isPublished: true },
            include: {
              progresses: { where: { studentId: user.id } },
              grades: { where: { studentId: user.id, publishedAt: { not: null } } },
              resources: { select: { id: true, isRequired: true } },
              prerequisites: {
                include: {
                  requiredActivity: {
                    include: {
                      progresses: { where: { studentId: user.id } }
                    }
                  }
                }
              }
            },
            orderBy: { position: "asc" }
          }
        },
        orderBy: { position: "asc" }
      }
    }
    }),
    getStudentDeadlineItems({ studentId: user.id, classId }),
    getPublishedAnnouncementsForStudent({ studentId: user.id, classId, take: 3 })
  ]);

  if (!teachingClass) notFound();

  return (
    <DashboardShell title={teachingClass.name} subtitle="Choose a mission and continue your quest.">
      <AIAssistantContextRegistration context={{ type: "STUDENT_CLASS", classId }} />
      <ClassTabs classId={classId} role="STUDENT" />
      <section className="mb-6 rounded-lg border border-border/80 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Recent announcements</h2>
          <Link
            className="text-sm font-semibold text-moss hover:text-ink"
            href={`/student/classes/${classId}/announcements`}
          >
            View all
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {announcements.length === 0 ? (
            <p className="text-sm text-ink/65">No published announcements in this realm yet.</p>
          ) : (
            announcements.map((announcement) => (
              <Link
                className="rounded-lg border border-border/80 bg-surface-muted p-4 transition hover:border-accent/40"
                href={`/student/classes/${classId}/announcements`}
                key={announcement.id}
              >
                <p className="font-semibold">{announcement.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink/65">{announcement.body}</p>
              </Link>
            ))
          )}
        </div>
      </section>
      <section className="mb-6">
        <h2 className="mb-4 text-xl font-bold">Upcoming deadlines</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {deadlines.filter((item) => item.state !== "future").slice(0, 4).length === 0 ? (
            <p className="rounded-lg border border-border/80 bg-surface p-4 text-sm text-ink/65">
              No upcoming or overdue deadlines in this realm.
            </p>
          ) : (
            deadlines
              .filter((item) => item.state !== "future")
              .slice(0, 4)
              .map((item) => (
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
      <div className="space-y-6">
        {teachingClass.modules.map((module, index) => (
          <Expander
            defaultOpen={index === 0}
            key={module.id}
            meta={`${module.activities.length} missions`}
            title={`Region ${module.position}: ${module.title}`}
          >
            <div className="mt-4 grid gap-3">
              {module.activities.map((activity) => {
                const progress = activity.progresses[0];
                const grade = activity.grades[0];
                const dueDate = activity.dueAt
                  ? activity.dueAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })
                  : "No due date";
                const deadlineState = classifyDeadline(activity.dueAt);
                const requiredResourceCount = activity.resources.filter((resource) => resource.isRequired).length;
                const isUnlocked = activity.prerequisites.every((prerequisite) => {
                  const prerequisiteProgress = prerequisite.requiredActivity.progresses[0];
                  const completed = prerequisiteProgress?.status === "COMPLETED";
                  const scoreMet =
                    !prerequisite.minimumScore ||
                    (prerequisiteProgress?.bestScore &&
                      Number(prerequisiteProgress.bestScore) >= Number(prerequisite.minimumScore));

                  return completed && scoreMet;
                });
                const cardContent = (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <MissionTypeIcon type={activity.type} />
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {activity.position}. {activity.title}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink/55">
                          <span>Due: {dueDate}</span>
                          {activity.dueAt ? <DeadlineBadge state={deadlineState} /> : null}
                        </p>
                        {activity.resources.length > 0 ? (
                          <p className="mt-1 text-sm font-medium text-moss">
                            {requiredResourceCount > 0
                              ? `${requiredResourceCount} required resource${requiredResourceCount === 1 ? "" : "s"}`
                              : `${activity.resources.length} resource${activity.resources.length === 1 ? "" : "s"} available`}
                          </p>
                        ) : null}
                        {!isUnlocked ? (
                          <p className="mt-1 text-sm font-medium text-ember">
                            Locked until prerequisite missions are complete.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <ProgressStatusBadge status={progress?.status} />
                      {grade ? (
                        <p className="mt-2 text-xs font-semibold text-ink/55">
                          Grade: {grade.score.toString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );

                if (!isUnlocked) {
                  return (
                    <div
                      className="rounded-md border border-ink/10 bg-ink/[0.03] p-4 opacity-75"
                      key={activity.id}
                    >
                      {cardContent}
                    </div>
                  );
                }

                return (
                  <Link
                    className="rounded-md border border-ink/10 p-4 transition hover:border-moss/60"
                    href={`/student/classes/${classId}/activities/${activity.id}`}
                    key={activity.id}
                  >
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </Expander>
        ))}
      </div>
    </DashboardShell>
  );
}
