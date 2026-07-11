import Link from "next/link";
import { notFound } from "next/navigation";

import { UpdateModuleForm } from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function EditRegionPage({
  params
}: {
  params: Promise<{ classId: string; moduleId: string }>;
}) {
  const { classId, moduleId } = await params;
  await requireClassLecturer(classId);

  const learningModule = await db.module.findFirst({
    where: { id: moduleId, classId }
  });

  if (!learningModule) notFound();

  return (
    <DashboardShell title="Edit region" subtitle={`Update ${learningModule.title}.`}>
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/modules`}
        >
          Back to regions
        </Link>
      </div>
      <UpdateModuleForm module={learningModule} />
    </DashboardShell>
  );
}
