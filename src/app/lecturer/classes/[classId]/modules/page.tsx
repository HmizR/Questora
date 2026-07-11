import { notFound } from "next/navigation";

import {
  ActivityPrerequisiteForm,
  CreateActivityForm,
  CreateModuleForm,
  DeleteActivityForm,
  DeleteModuleForm,
  PublishActivityForm,
  PublishModuleForm,
  UpdateActivityForm,
  UpdateModuleForm
} from "@/components/lecturer/forms";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { Expander } from "@/components/ui/expander";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerModulesPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassLecturer(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      modules: {
        include: {
          activities: {
            include: {
              prerequisites: {
                include: {
                  requiredActivity: true
                },
                orderBy: {
                  requiredActivity: {
                    position: "asc"
                  }
                }
              }
            },
            orderBy: { position: "asc" }
          }
        },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();
  const allActivities = teachingClass.modules.flatMap((learningModule) => learningModule.activities);

  return (
    <DashboardShell
      title="Regions and missions"
      subtitle="Create, update, publish, and delete regions and their learning missions."
    >
      <CreateModuleForm classId={classId} />
      <div className="mt-6 space-y-6">
        {teachingClass.modules.map((module, moduleIndex) => (
          <Expander
            defaultOpen={moduleIndex === 0}
            key={module.id}
            meta={`${module.isPublished ? "Published" : "Draft"} - ${module.activities.length} missions`}
            title={`${module.position}. ${module.title}`}
          >
            <div className="flex justify-end gap-2">
              {!module.isPublished ? <PublishModuleForm moduleId={module.id} /> : null}
              <DeleteModuleForm moduleId={module.id} />
            </div>
            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <UpdateModuleForm module={module} />
              <CreateActivityForm moduleId={module.id} />
            </div>
            <div className="mt-6 space-y-4">
              {module.activities.map((activity) => (
                <Expander
                  className="shadow-none"
                  key={activity.id}
                  meta={`${activity.type} - ${activity.isPublished ? "Published" : "Draft"}`}
                  title={`${activity.position}. ${activity.title}`}
                >
                  <div className="mb-4 flex justify-end gap-2">
                    {!activity.isPublished ? <PublishActivityForm activityId={activity.id} /> : null}
                    <DeleteActivityForm activityId={activity.id} />
                  </div>
                  <div className="grid gap-5 xl:grid-cols-2">
                    <UpdateActivityForm activity={activity} />
                    <ActivityPrerequisiteForm
                      activities={allActivities}
                      activityId={activity.id}
                      classId={classId}
                      prerequisites={activity.prerequisites}
                    />
                  </div>
                </Expander>
              ))}
            </div>
          </Expander>
        ))}
      </div>
    </DashboardShell>
  );
}
