import { notFound } from "next/navigation";

import { LecturerLinks } from "@/components/lecturer/lecturer-links";
import {
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
        include: { activities: { orderBy: { position: "asc" } } },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();

  return (
    <DashboardShell
      title="Regions and missions"
      subtitle="Create, update, publish, and delete regions and their learning missions."
    >
      <LecturerLinks classId={classId} />
      <CreateModuleForm classId={classId} />
      <div className="mt-6 space-y-6">
        {teachingClass.modules.map((module) => (
          <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm" key={module.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {module.position}. {module.title}
                </h2>
                <p className="mt-1 text-sm text-ink/60">{module.isPublished ? "Published" : "Draft"}</p>
              </div>
              <div className="flex gap-2">
                {!module.isPublished ? <PublishModuleForm moduleId={module.id} /> : null}
                <DeleteModuleForm moduleId={module.id} />
              </div>
            </div>
            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <UpdateModuleForm module={module} />
              <CreateActivityForm moduleId={module.id} />
            </div>
            <div className="mt-6 space-y-4">
              {module.activities.map((activity) => (
                <div className="rounded-lg border border-ink/10 p-4" key={activity.id}>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {activity.position}. {activity.title}
                      </p>
                      <p className="text-sm text-ink/60">
                        {activity.type} · {activity.isPublished ? "Published" : "Draft"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!activity.isPublished ? <PublishActivityForm activityId={activity.id} /> : null}
                      <DeleteActivityForm activityId={activity.id} />
                    </div>
                  </div>
                  <UpdateActivityForm activity={activity} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
