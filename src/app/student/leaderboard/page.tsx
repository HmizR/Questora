import Link from "next/link";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { AvatarImage } from "@/components/ui/avatar-image";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function StudentLeaderboardPage() {
  await requireRole("STUDENT");

  const students = await db.user.findMany({
    where: { role: "STUDENT", status: "ACTIVE" },
    include: {
      profile: true,
      badges: { select: { badgeId: true } }
    },
    orderBy: { name: "asc" }
  });

  const rankedStudents = students
    .map((student) => ({
      id: student.id,
      avatarUrl: student.avatarUrl,
      name: student.name,
      xp: student.profile?.totalXp ?? 0,
      level: student.profile?.level ?? 1,
      badgeCount: student.badges.length
    }))
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));

  return (
    <DashboardShell
      title="Global leaderboard"
      subtitle="Compare adventurer XP, levels, and badges across Questora."
    >
      <div className="overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">XP</th>
              <th className="px-4 py-3 font-semibold">Level</th>
              <th className="px-4 py-3 font-semibold">Badges</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {rankedStudents.map((student, index) => (
              <tr key={student.id}>
                <td className="px-4 py-3 font-bold">#{index + 1}</td>
                <td className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-3">
                    <AvatarImage avatarUrl={student.avatarUrl} name={student.name} size="sm" />
                    <Link
                      className="text-ink hover:text-moss hover:underline"
                      href={`/student/profiles/${student.id}`}
                    >
                      {student.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3">{student.xp}</td>
                <td className="px-4 py-3">{student.level}</td>
                <td className="px-4 py-3">
                  {student.badgeCount} {student.badgeCount === 1 ? "badge" : "badges"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
