import Link from "next/link";

import { CreateModuleForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function NewRegionPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);
  const lastModule = await db.module.findFirst({
    where: { classId },
    orderBy: { position: "desc" },
    select: { position: true }
  });
  const nextPosition = (lastModule?.position ?? 0) + 1;

  return (
    <DashboardShell title="New region" subtitle="Create a new learning region for this realm.">
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/modules`}
        >
          Back to regions
        </Link>
      </div>
      <CreateModuleForm classId={classId} initialPosition={nextPosition} />
    </DashboardShell>
  );
}
