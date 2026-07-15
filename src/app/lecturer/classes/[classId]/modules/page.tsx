import { ActivityType, SubmissionStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
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
      students: {
        where: { status: "ACTIVE" },
        select: { studentId: true }
      },
      modules: {
        include: {
          activities: {
            include: {
              submissions: {
                where: {
                  status: {
                    in: [
                      SubmissionStatus.SUBMITTED,
                      SubmissionStatus.GRADED,
                      SubmissionStatus.RETURNED
                    ]
                  }
                },
                select: { studentId: true }
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
  const activeStudentCount = teachingClass.students.length;
  const activeStudentIds = new Set(teachingClass.students.map((student) => student.studentId));

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
              {module.activities.map((activity) => {
                const submittedCount = activity.submissions.filter((submission) =>
                  activeStudentIds.has(submission.studentId)
                ).length;

                return (
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
                    {activity.type === ActivityType.ASSIGNMENT ||
                    activity.type === ActivityType.PROJECT ? (
                      <div className="rounded-lg border border-ink/10 bg-parchment/50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-bold">Submission status</p>
                            <p className="mt-1 text-sm text-ink/65">
                              Submitted {submittedCount} / Not submitted{" "}
                              {Math.max(activeStudentCount - submittedCount, 0)}
                            </p>
                          </div>
                          <Link
                            className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white"
                            href={`/lecturer/classes/${classId}/modules/${module.id}/activities/${activity.id}/submissions`}
                          >
                            Review submissions
                          </Link>
                        </div>
                      </div>
                    ) : activity.type === ActivityType.QUIZ ? (
                      <div className="rounded-lg border border-ink/10 bg-parchment/50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-bold">Quiz analytics</p>
                            <p className="mt-1 text-sm text-ink/65">
                              Review attempts, scores, pass rate, and question results.
                            </p>
                          </div>
                          <Link
                            className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white"
                            href={`/lecturer/classes/${classId}/modules/${module.id}/activities/${activity.id}/quiz`}
                          >
                            View quiz analytics
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-ink/10 bg-parchment/50 p-4 text-sm text-ink/65">
                        No submission review needed for this mission type.
                      </div>
                    )}
                  </Expander>
                );
              })}
            </div>
          </Expander>
        ))}
      </div>
    </DashboardShell>
  );
}
