import Link from "next/link";
import { notFound } from "next/navigation";

import { UpdateQuestForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
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
    where: { id: questId, classId }
  });

  if (!quest) notFound();

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
      <UpdateQuestForm quest={quest} />
    </DashboardShell>
  );
}
