import { ProgressStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassTabs } from "@/components/ui/class-tabs";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { AvatarImage } from "@/components/ui/avatar-image";
import { requireClassEnrollment } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function StudentClassLeaderboardPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireClassEnrollment(classId);

  const teachingClass = await db.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        where: { status: "ACTIVE" },
        include: { student: true },
        orderBy: [{ student: { name: "asc" } }, { enrolledAt: "asc" }]
      },
      modules: {
        where: { isPublished: true },
        include: {
          activities: {
            where: { isPublished: true },
            include: {
              progresses: {
                where: { status: ProgressStatus.COMPLETED },
                select: { studentId: true }
              }
            },
            orderBy: { position: "asc" }
          }
        },
        orderBy: { position: "asc" }
      },
      quests: {
        where: { isPublished: true },
        include: {
          activities: {
            where: { activity: { isRequired: true, isPublished: true } },
            include: {
              activity: {
                include: {
                  progresses: {
                    where: { status: ProgressStatus.COMPLETED },
                    select: { studentId: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!teachingClass) notFound();

  const xpTransactions = await db.xPTransaction.groupBy({
    by: ["studentId"],
    where: {
      classId,
      sourceType: "QUEST",
      studentId: { in: teachingClass.students.map((enrollment) => enrollment.studentId) }
    },
    _sum: { amount: true }
  });

  const xpByStudentId = new Map(
    xpTransactions.map((transaction) => [transaction.studentId, transaction._sum.amount ?? 0])
  );
  const missions = teachingClass.modules.flatMap((learningModule) => learningModule.activities);
  const totalMissions = missions.length;
  const totalQuests = teachingClass.quests.length;

  const rows = teachingClass.students
    .map((enrollment) => {
      const completedMissions = missions.filter((mission) =>
        mission.progresses.some((progress) => progress.studentId === enrollment.studentId)
      ).length;
      const completedQuests = teachingClass.quests.filter((quest) => {
        if (quest.activities.length === 0) {
          return false;
        }

        return quest.activities.every((link) =>
          link.activity.progresses.some((progress) => progress.studentId === enrollment.studentId)
        );
      }).length;
      const progressPercent =
        totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

      return {
        studentId: enrollment.studentId,
        avatarUrl: enrollment.student.avatarUrl,
        name: enrollment.student.name,
        xp: xpByStudentId.get(enrollment.studentId) ?? 0,
        completedMissions,
        progressPercent,
        completedQuests
      };
    })
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));

  return (
    <DashboardShell
      title={`${teachingClass.name} leaderboard`}
      subtitle="Class ranking based on XP earned from completed quests in this realm."
    >
      <ClassTabs classId={classId} role="STUDENT" />
      <div className="overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">XP</th>
              <th className="px-4 py-3 font-semibold">Missions</th>
              <th className="px-4 py-3 font-semibold">Progress</th>
              <th className="px-4 py-3 font-semibold">Quests</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {rows.map((row, index) => (
              <tr key={row.studentId}>
                <td className="px-4 py-3 font-bold">#{index + 1}</td>
                <td className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-3">
                    <AvatarImage avatarUrl={row.avatarUrl} name={row.name} size="sm" />
                    <Link
                      className="text-ink hover:text-moss hover:underline"
                      href={`/student/profiles/${row.studentId}`}
                    >
                      {row.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3">{row.xp}</td>
                <td className="px-4 py-3">
                  {row.completedMissions}/{totalMissions}
                </td>
                <td className="px-4 py-3">{row.progressPercent}%</td>
                <td className="px-4 py-3">
                  {row.completedQuests}/{totalQuests}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
