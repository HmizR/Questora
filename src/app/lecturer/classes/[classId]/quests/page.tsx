import { notFound } from "next/navigation";

import {
  ConnectQuestActivityForm,
  CreateQuestForm,
  PublishQuestForm,
  UpdateQuestForm
} from "@/components/lecturer/forms";
import { LecturerLinks } from "@/components/lecturer/lecturer-links";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerQuestsPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      modules: { include: { activities: { orderBy: { position: "asc" } } } },
      quests: {
        include: {
          activities: {
            include: { activity: true },
            orderBy: { position: "asc" }
          }
        },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();

  const activities = teachingClass.modules.flatMap((module) => module.activities);

  return (
    <DashboardShell
      title="Quest management"
      subtitle="Create RPG-style quest chains, connect missions, and configure XP rewards."
    >
      <LecturerLinks classId={classId} />
      <CreateQuestForm classId={classId} />
      <div className="mt-6 grid gap-6">
        {teachingClass.quests.map((quest) => (
          <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm" key={quest.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-moss">{quest.type}</p>
                <h2 className="mt-1 text-xl font-bold">{quest.title}</h2>
                <p className="mt-2 text-sm text-ink/65">
                  {quest.xpReward} XP · {quest.isPublished ? "Published" : "Draft"} ·{" "}
                  {quest.isOptional ? "Optional" : "Required"}
                </p>
              </div>
              {!quest.isPublished ? <PublishQuestForm questId={quest.id} /> : null}
            </div>
            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <UpdateQuestForm quest={quest} />
              <div className="rounded-lg border border-ink/10 p-5">
                <h3 className="font-bold">Connected missions</h3>
                <div className="mt-3 space-y-2">
                  {quest.activities.length === 0 ? (
                    <p className="text-sm text-ink/65">No missions connected yet.</p>
                  ) : (
                    quest.activities.map((link) => (
                      <p className="text-sm" key={link.activityId}>
                        {link.position}. {link.activity.title}
                      </p>
                    ))
                  )}
                </div>
                <ConnectQuestActivityForm questId={quest.id} activities={activities} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
