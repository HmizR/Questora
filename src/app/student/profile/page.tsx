import { LevelProgress } from "@/components/gamification/level-progress";
import { AvatarImage } from "@/components/ui/avatar-image";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function StudentProfilePage() {
  const user = await requireRole("STUDENT");

  const [currentUser, profile, badges, xpTransactions, grades] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { avatarUrl: true, name: true }
    }),
    db.studentProfile.findUnique({ where: { studentId: user.id } }),
    db.studentBadge.findMany({
      where: { studentId: user.id },
      include: { badge: true },
      orderBy: { awardedAt: "desc" }
    }),
    db.xPTransaction.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    db.grade.findMany({
      where: { studentId: user.id, publishedAt: { not: null } },
      include: { activity: { include: { module: { include: { class: true } } } } },
      orderBy: { publishedAt: "desc" },
      take: 10
    })
  ]);

  return (
    <DashboardShell title="Adventurer profile" subtitle="Your own XP, level, badges, and published grades.">
      <section className="mb-6 flex items-center gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <AvatarImage avatarUrl={currentUser.avatarUrl} name={currentUser.name} />
        <div className="min-w-0">
          <h2 className="text-xl font-bold">{currentUser.name}</h2>
          <p className="mt-1 text-sm text-ink/60">Level {profile?.level ?? 1} adventurer</p>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LevelProgress totalXp={profile?.totalXp ?? 0} />
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Current streak" value={profile?.currentStreak ?? 0} />
          <StatCard label="Longest streak" value={profile?.longestStreak ?? 0} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Badges</h2>
          <div className="mt-4 space-y-3">
            {badges.length === 0 ? (
              <EmptyState
                description="Badges appear as you complete missions, quests, and special goals."
                title="No badges yet"
              />
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
              <EmptyState
                description="XP awards will appear here after quest completion."
                title="No XP transactions yet"
              />
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
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Published grades</h2>
          <div className="mt-4 space-y-3">
            {grades.length === 0 ? (
              <EmptyState
                description="Published grades will appear here after lecturer review."
                title="No published grades yet"
              />
            ) : (
              grades.map((grade) => (
                <div key={grade.id}>
                  <p className="font-semibold">{grade.activity.title}</p>
                  <p className="text-sm text-ink/60">
                    {grade.activity.module.class.name} · {grade.score.toString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
