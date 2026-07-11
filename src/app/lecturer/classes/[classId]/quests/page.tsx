import { ProgressStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  DeleteQuestForm,
  lecturerMenuDangerClassName,
  lecturerMenuItemClassName,
  PublishQuestForm
} from "@/components/lecturer/forms";
import { ActionMenu } from "@/components/ui/action-menu";
import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { Expander } from "@/components/ui/expander";
import { requireClassLecturer } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerQuestsPage({
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
      quests: {
        include: {
          activities: {
            include: {
              activity: {
                include: {
                  progresses: {
                    where: { status: ProgressStatus.COMPLETED },
                    select: { studentId: true }
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

  const activeStudentIds = teachingClass.students.map((student) => student.studentId);

  return (
    <DashboardShell
      title="Quest management"
      subtitle="Create RPG-style quest chains, connect missions, and configure XP rewards."
    >
      <ClassTabs classId={classId} role="LECTURER" />
      <div className="mb-6 flex justify-end">
        <Link
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel"
          href={`/lecturer/classes/${classId}/quests/new`}
        >
          New quest
        </Link>
      </div>
      <div className="mt-6 grid gap-6">
        {teachingClass.quests.map((quest, index) => {
          const requiredLinks = quest.activities.filter((link) => link.activity.isRequired);
          const completedCount =
            quest.isPublished && requiredLinks.length > 0
              ? activeStudentIds.filter((studentId) =>
                  requiredLinks.every((link) =>
                    link.activity.progresses.some((progress) => progress.studentId === studentId)
                  )
                ).length
              : 0;
          const notCompletedCount = Math.max(activeStudentIds.length - completedCount, 0);

          return (
            <Expander
              defaultOpen={index === 0}
              key={quest.id}
              meta={`${quest.type} - ${quest.xpReward} XP - ${
                quest.isPublished ? "Published" : "Draft"
              } - ${quest.isOptional ? "Optional" : "Required"}`}
              title={quest.title}
            >
              <div className="flex justify-end">
                <ActionMenu label={`Actions for ${quest.title}`}>
                  <Link
                    className={lecturerMenuItemClassName}
                    href={`/lecturer/classes/${classId}/quests/${quest.id}/edit`}
                  >
                    Edit
                  </Link>
                  {!quest.isPublished ? (
                    <PublishQuestForm
                      buttonClassName={lecturerMenuItemClassName}
                      questId={quest.id}
                    />
                  ) : null}
                  <DeleteQuestForm
                    buttonClassName={lecturerMenuDangerClassName}
                    questId={quest.id}
                  />
                </ActionMenu>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
                <div className="rounded-lg border border-ink/10 p-5">
                  <h3 className="font-bold">Connected missions</h3>
                  <div className="mt-3 space-y-2">
                    {quest.activities.length === 0 ? (
                      <p className="text-sm text-ink/65">No missions connected yet.</p>
                    ) : (
                      quest.activities.map((link) => (
                        <p className="text-sm" key={link.activityId}>
                          {link.position}. {link.activity.title}
                          {!link.activity.isRequired ? (
                            <span className="ml-2 text-xs text-ink/50">Optional</span>
                          ) : null}
                        </p>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-ink/10 bg-parchment/50 p-5">
                  <h3 className="font-bold">Completion</h3>
                  <p className="mt-3 text-sm text-ink/65">
                    Completed {completedCount} / Not completed {notCompletedCount}
                  </p>
                </div>
              </div>
            </Expander>
          );
        })}
      </div>
    </DashboardShell>
  );
}
