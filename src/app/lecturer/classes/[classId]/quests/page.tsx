import { notFound } from "next/navigation";
import Link from "next/link";

import {
  ConnectQuestActivityForm,
  PublishQuestForm,
  UpdateQuestForm
} from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { Expander } from "@/components/ui/expander";
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
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-6 flex justify-end">
        <Link
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel"
          href={`/lecturer/classes/${classId}/quests/new`}
        >
          New quest
        </Link>
      </div>
      <div className="mt-6 grid gap-6">
        {teachingClass.quests.map((quest, index) => (
          <Expander
            defaultOpen={index === 0}
            key={quest.id}
            meta={`${quest.type} - ${quest.xpReward} XP - ${
              quest.isPublished ? "Published" : "Draft"
            } - ${quest.isOptional ? "Optional" : "Required"}`}
            title={quest.title}
          >
            <div className="flex justify-end">
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
          </Expander>
        ))}
      </div>
    </DashboardShell>
  );
}
