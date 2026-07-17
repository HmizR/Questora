import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ActivityPrerequisiteForm,
  MissionResourcesPanel,
  UpdateActivityForm
} from "@/components/lecturer/forms";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function EditMissionPage({
  params
}: {
  params: Promise<{ classId: string; moduleId: string; activityId: string }>;
}) {
  const { classId, moduleId, activityId } = await params;
  await requireClassLecturer(classId);

  const activity = await db.activity.findFirst({
    where: {
      id: activityId,
      moduleId,
      module: { classId }
    },
    include: {
      module: true,
      prerequisites: {
        include: {
          requiredActivity: true
        },
        orderBy: {
          requiredActivity: {
            position: "asc"
          }
        }
      },
      resources: {
        orderBy: { position: "asc" }
      }
    }
  });

  if (!activity) notFound();

  const allActivities = await db.activity.findMany({
    where: { module: { classId } },
    orderBy: [{ module: { position: "asc" } }, { position: "asc" }]
  });

  return (
    <DashboardShell title="Edit mission" subtitle={`Update ${activity.title} in ${activity.module.title}.`}>
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-5">
        <Link
          className="text-sm font-semibold text-ink/65 hover:text-ink"
          href={`/lecturer/classes/${classId}/modules`}
        >
          Back to regions
        </Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <UpdateActivityForm activity={activity} />
        <div className="space-y-6">
          <ActivityPrerequisiteForm
            activities={allActivities}
            activityId={activity.id}
            classId={classId}
            prerequisites={activity.prerequisites}
          />
          <MissionResourcesPanel
            activityId={activity.id}
            classId={classId}
            moduleId={moduleId}
            resources={activity.resources}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
