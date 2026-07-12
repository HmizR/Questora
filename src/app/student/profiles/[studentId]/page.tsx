import Link from "next/link";
import { notFound } from "next/navigation";

import { LevelProgress } from "@/components/gamification/level-progress";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function PublicStudentProfilePage({
  params
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  await requireRole("STUDENT");

  const student = await db.user.findFirst({
    where: {
      id: studentId,
      role: "STUDENT",
      status: "ACTIVE"
    }
  });

  if (!student) notFound();

  const [profile, badges, xpTransactions] = await Promise.all([
    db.studentProfile.findUnique({ where: { studentId } }),
    db.studentBadge.findMany({
      where: { studentId },
      include: { badge: true },
      orderBy: { awardedAt: "desc" }
    }),
    db.xPTransaction.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return (
    <DashboardShell title={`${student.name}'s profile`} subtitle="Public XP, badges, and adventurer progress.">
      <div className="mb-5">
        <Link className="text-sm font-semibold text-ink/65 hover:text-ink" href="/student/leaderboard">
          Back to leaderboard
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LevelProgress totalXp={profile?.totalXp ?? 0} />
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Current streak" value={profile?.currentStreak ?? 0} />
          <StatCard label="Longest streak" value={profile?.longestStreak ?? 0} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Badges</h2>
          <div className="mt-4 space-y-3">
            {badges.length === 0 ? (
              <p className="text-sm text-ink/65">No badges yet.</p>
            ) : (
              badges.map((entry) => (
                <div key={entry.badgeId}>
                  <p className="font-semibold">{entry.badge.name}</p>
                  <p className="text-sm text-ink/60">{entry.badge.description}</p>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Recent XP</h2>
          <div className="mt-4 space-y-3">
            {xpTransactions.length === 0 ? (
              <p className="text-sm text-ink/65">No XP transactions yet.</p>
            ) : (
              xpTransactions.map((transaction) => (
                <div key={transaction.id}>
                  <p className="font-semibold">+{transaction.amount} XP</p>
                  <p className="text-sm text-ink/60">{transaction.description}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
