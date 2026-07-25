import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ConnectQuestActivityForm,
  RemoveQuestActivityForm,
  UpdateQuestForm
} from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { activityTypeLabel, MissionTypeIcon } from "@/components/ui/mission-display";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function EditQuestPage({
  params
}: {
  params: Promise<{ classId: string; questId: string }>;
}) {
  const { classId, questId } = await params;
  await requireClassLecturer(classId);

  const quest = await db.quest.findFirst({
    where: { id: questId, classId },
    include: {
      activities: {
        include: { activity: true },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!quest) notFound();

  const activities = await db.activity.findMany({
    where: { module: { classId } },
    orderBy: [{ module: { position: "asc" } }, { position: "asc" }]
  });

  return (
    <DashboardShell title="Edit quest" subtitle={`Update ${quest.title}.`}>
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/quests`}
        >
          Back to quests
        </Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <UpdateQuestForm quest={quest} />
        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Connected missions</h2>
          <div className="mt-4 space-y-3">
            {quest.activities.length === 0 ? (
              <p className="text-sm text-ink/65">No missions connected yet.</p>
            ) : (
              quest.activities.map((link) => (
                <div
                  className="flex flex-col gap-3 rounded-md border border-ink/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={link.activityId}
                >
                  <div className="flex min-w-0 gap-3">
                    <MissionTypeIcon className="h-9 w-9" type={link.activity.type} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {link.position}. {link.activity.title}
                      </p>
                      <p className="mt-1 text-xs text-ink/60">
                        {activityTypeLabel(link.activity.type)} - {link.activity.isRequired ? "Required" : "Optional"}
                      </p>
                    </div>
                  </div>
                  <RemoveQuestActivityForm
                    activityId={link.activityId}
                    classId={classId}
                    questId={quest.id}
                  />
                </div>
              ))
            )}
          </div>
          <ConnectQuestActivityForm
            activities={activities}
            classId={classId}
            questId={quest.id}
          />
        </section>
      </div>
    </DashboardShell>
  );
}
