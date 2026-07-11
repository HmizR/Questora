import { notFound } from "next/navigation";
import Link from "next/link";

import {
  ActivityPrerequisiteForm,
  DeleteActivityForm,
  DeleteModuleForm,
  lecturerMenuDangerClassName,
  lecturerMenuItemClassName,
  PublishActivityForm,
  PublishModuleForm
} from "@/components/lecturer/forms";
import { ActionMenu } from "@/components/ui/action-menu";
import { ClassTabs } from "@/components/ui/class-tabs";
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
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-6 flex justify-end">
        <Link
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel"
          href={`/lecturer/classes/${classId}/modules/new`}
        >
          New region
        </Link>
      </div>
      <div className="mt-6 space-y-6">
        {teachingClass.modules.map((module, moduleIndex) => (
          <Expander
            defaultOpen={moduleIndex === 0}
            key={module.id}
            meta={`${module.isPublished ? "Published" : "Draft"} - ${module.activities.length} missions`}
            title={`${module.position}. ${module.title}`}
          >
            <div className="flex items-center justify-end gap-2">
              <Link
                className="inline-flex min-h-[30px] items-center rounded-md border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold leading-none hover:bg-ink hover:text-white"
                href={`/lecturer/classes/${classId}/modules/${module.id}/activities/new`}
              >
                New mission
              </Link>
              <ActionMenu label={`Actions for ${module.title}`}>
                <Link
                  className={lecturerMenuItemClassName}
                  href={`/lecturer/classes/${classId}/modules/${module.id}/edit`}
                >
                  Edit
                </Link>
                {!module.isPublished ? (
                  <PublishModuleForm
                    buttonClassName={lecturerMenuItemClassName}
                    moduleId={module.id}
                  />
                ) : null}
                <DeleteModuleForm
                  buttonClassName={lecturerMenuDangerClassName}
                  moduleId={module.id}
                />
              </ActionMenu>
            </div>
            <div className="mt-6 space-y-4">
              {module.activities.map((activity) => (
                <Expander
                  className="shadow-none"
                  key={activity.id}
                  meta={`${activity.type} - ${activity.isPublished ? "Published" : "Draft"}`}
                  title={`${activity.position}. ${activity.title}`}
                >
                  <div className="mb-4 flex justify-end">
                    <ActionMenu label={`Actions for ${activity.title}`}>
                      <Link
                        className={lecturerMenuItemClassName}
                        href={`/lecturer/classes/${classId}/modules/${module.id}/activities/${activity.id}/edit`}
                      >
                        Edit
                      </Link>
                      {!activity.isPublished ? (
                        <PublishActivityForm
                          activityId={activity.id}
                          buttonClassName={lecturerMenuItemClassName}
                        />
                      ) : null}
                      <DeleteActivityForm
                        activityId={activity.id}
                        buttonClassName={lecturerMenuDangerClassName}
                      />
                    </ActionMenu>
                  </div>
                  <ActivityPrerequisiteForm
                    activities={allActivities}
                    activityId={activity.id}
                    classId={classId}
                    prerequisites={activity.prerequisites}
                  />
                </Expander>
              ))}
            </div>
          </Expander>
        ))}
      </div>
    </DashboardShell>
  );
}
