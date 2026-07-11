import Link from "next/link";

import { CreateQuestForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";

export default async function NewQuestPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

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
      <CreateQuestForm classId={classId} />
    </DashboardShell>
  );
}
