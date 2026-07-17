import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { Expander } from "@/components/ui/expander";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function StudentClassPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { user } = await requireClassEnrollment(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      modules: {
        where: {
          isPublished: true,
          OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }]
        },
        include: {
          activities: {
            where: { isPublished: true },
            include: {
              progresses: { where: { studentId: user.id } },
              grades: { where: { studentId: user.id, publishedAt: { not: null } } },
              resources: { select: { id: true } },
              prerequisites: {
                include: {
                  requiredActivity: {
                    include: {
                      progresses: { where: { studentId: user.id } }
                    }
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

  return (
    <DashboardShell title={teachingClass.name} subtitle="Choose a mission and continue your quest.">
      <ClassTabs classId={classId} role="STUDENT" />
      <div className="space-y-6">
        {teachingClass.modules.map((module, index) => (
          <Expander
            defaultOpen={index === 0}
            key={module.id}
            meta={`${module.activities.length} missions`}
            title={`Region ${module.position}: ${module.title}`}
          >
            <div className="mt-4 grid gap-3">
              {module.activities.map((activity) => {
                const progress = activity.progresses[0];
                const grade = activity.grades[0];
                const dueDate = activity.dueAt
                  ? activity.dueAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })
                  : "No due date";
                const isUnlocked = activity.prerequisites.every((prerequisite) => {
                  const prerequisiteProgress = prerequisite.requiredActivity.progresses[0];
                  const completed = prerequisiteProgress?.status === "COMPLETED";
                  const scoreMet =
                    !prerequisite.minimumScore ||
                    (prerequisiteProgress?.bestScore &&
                      Number(prerequisiteProgress.bestScore) >= Number(prerequisite.minimumScore));

                  return completed && scoreMet;
                });
                const cardContent = (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {activity.position}. {activity.title}
                      </p>
                      <p className="text-sm text-ink/60">
                        {activity.type} - {progress?.status ?? "NOT_STARTED"}
                      </p>
                      <p className="mt-1 text-sm text-ink/55">Due: {dueDate}</p>
                      {activity.resources.length > 0 ? (
                        <p className="mt-1 text-sm font-medium text-moss">
                          {activity.resources.length} resource{activity.resources.length === 1 ? "" : "s"} available
                        </p>
                      ) : null}
                      {!isUnlocked ? (
                        <p className="mt-1 text-sm font-medium text-ember">
                          Locked until prerequisite missions are complete.
                        </p>
                      ) : null}
                    </div>
                    <div className="text-sm text-ink/65">
                      {grade ? `Grade: ${grade.score.toString()}` : `${progress?.progressPercent ?? 0}%`}
                    </div>
                  </div>
                );

                if (!isUnlocked) {
                  return (
                    <div
                      className="rounded-md border border-ink/10 bg-ink/[0.03] p-4 opacity-75"
                      key={activity.id}
                    >
                      {cardContent}
                    </div>
                  );
                }

                return (
                  <Link
                    className="rounded-md border border-ink/10 p-4 transition hover:border-moss/60"
                    href={`/student/classes/${classId}/activities/${activity.id}`}
                    key={activity.id}
                  >
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </Expander>
        ))}
      </div>
    </DashboardShell>
  );
}
