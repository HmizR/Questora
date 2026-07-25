import Link from "next/link";

import { CreateQuestForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function NewQuestPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);
  const lastQuest = await db.quest.findFirst({
    where: { classId },
    orderBy: { position: "desc" },
    select: { position: true }
  });
  const nextPosition = (lastQuest?.position ?? 0) + 1;

  return (
    <DashboardShell title="New quest" subtitle="Create a new quest chain for this realm.">
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/quests`}
        >
          Back to quests
        </Link>
      </div>
      <CreateQuestForm classId={classId} initialPosition={nextPosition} />
    </DashboardShell>
  );
}
