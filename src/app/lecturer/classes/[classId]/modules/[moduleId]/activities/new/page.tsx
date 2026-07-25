import Link from "next/link";
import { notFound } from "next/navigation";

import { CreateActivityForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function NewMissionPage({
  params
}: {
  params: Promise<{ classId: string; moduleId: string }>;
}) {
  const { classId, moduleId } = await params;
  await requireClassLecturer(classId);

  const learningModule = await db.module.findFirst({
    where: { id: moduleId, classId },
    select: { title: true }
  });

  if (!learningModule) notFound();

  const lastActivity = await db.activity.findFirst({
    where: { moduleId },
    orderBy: { position: "desc" },
    select: { position: true }
  });
  const nextPosition = (lastActivity?.position ?? 0) + 1;

  return (
    <DashboardShell
      title="New mission"
      subtitle={`Create a new mission in ${learningModule.title}.`}
    >
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/modules`}
        >
          Back to regions
        </Link>
      </div>
      <CreateActivityForm moduleId={moduleId} initialPosition={nextPosition} />
    </DashboardShell>
  );
}
