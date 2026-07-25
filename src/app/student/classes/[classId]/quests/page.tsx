import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { MissionTypeIcon, ProgressStatusBadge } from "@/components/ui/mission-display";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function StudentQuestsPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { user } = await requireClassEnrollment(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      quests: {
        where: { isPublished: true },
        include: {
          activities: {
            include: {
              activity: {
                include: {
                  progresses: { where: { studentId: user.id } }
                }
              }
            },
            orderBy: { position: "asc" }
          }
        },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();

  return (
    <DashboardShell
      title={`${teachingClass.name} quests`}
      subtitle="Quest completion is derived from required mission progress."
    >
      <ClassTabs classId={classId} role="STUDENT" />
      <div className="grid gap-4">
        {teachingClass.quests.map((quest) => {
          const requiredLinks = quest.activities.filter((link) => link.activity.isRequired);
          const completedRequired = requiredLinks.filter((link) =>
            link.activity.progresses.some((progress) => progress.status === "COMPLETED")
          ).length;
          const isComplete = requiredLinks.length > 0 && completedRequired === requiredLinks.length;
          const percent =
            requiredLinks.length > 0
              ? Math.round((completedRequired / requiredLinks.length) * 100)
              : 0;

          return (
            <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm" key={quest.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-moss">{quest.type}</p>
                  <h2 className="mt-1 text-xl font-bold">{quest.title}</h2>
                  <p className="mt-2 text-sm text-ink/65">
                    {quest.xpReward} XP - {quest.isOptional ? "Optional" : "Main path"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-ink/70">
                  {isComplete ? "Complete" : `${completedRequired}/${requiredLinks.length} required`}
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full bg-ember" style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-4 space-y-2">
                {quest.activities.map((link) => {
                  const progress = link.activity.progresses[0];
                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-surface-muted p-3"
                      key={link.activityId}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <MissionTypeIcon className="h-9 w-9" type={link.activity.type} />
                        <p className="min-w-0 truncate text-sm font-semibold text-ink/80">
                          {link.position}. {link.activity.title}
                        </p>
                      </div>
                      <ProgressStatusBadge status={progress?.status} />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </DashboardShell>
  );
}
