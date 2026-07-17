import { BookOpen, CheckCircle2, Gauge } from "lucide-react";

import { QuestCard } from "@/components/gamification/quest-card";
import { LevelProgress } from "@/components/gamification/level-progress";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function StudentDashboardPage() {
  const user = await requireRole("STUDENT");
  const [profile, activeClasses, recentGrades, publishedActivities, completedActivities, quests] =
    await Promise.all([
    db.studentProfile.findUnique({ where: { studentId: user.id } }),
    db.classStudent.count({ where: { studentId: user.id, status: "ACTIVE" } }),
    db.grade.findMany({
      where: { studentId: user.id, publishedAt: { not: null } },
      include: { activity: { include: { module: { include: { class: true } } } } },
      orderBy: { publishedAt: "desc" },
      take: 3
    }),
    db.activity.count({
      where: {
        isPublished: true,
        module: {
          isPublished: true,
          class: {
            students: {
              some: {
                studentId: user.id,
                status: "ACTIVE"
              }
            }
          }
        }
      }
    }),
    db.activityProgress.count({
      where: {
        studentId: user.id,
        status: "COMPLETED",
        activity: {
          isPublished: true,
          module: {
            isPublished: true
          }
        }
      }
    }),
    db.quest.findMany({
      where: {
        isPublished: true,
        class: {
          students: {
            some: {
              studentId: user.id,
              status: "ACTIVE"
            }
          }
        }
      },
      include: {
        activities: {
          where: { activity: { isRequired: true } },
          include: {
            activity: {
              include: {
                progresses: { where: { studentId: user.id } }
              }
            }
          },
          orderBy: { position: "asc" }
        }
      },
      orderBy: [{ type: "asc" }, { position: "asc" }],
      take: 4
    })
  ]);

  const totalXp = profile?.totalXp ?? 0;
  const progressPercent =
    publishedActivities > 0 ? Math.round((completedActivities / publishedActivities) * 100) : 0;

  return (
    <DashboardShell
      title="Adventurer dashboard"
      subtitle="Track experience points, active learning realms, mission progress, and published grades."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <LevelProgress totalXp={totalXp} />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={BookOpen} label="Active realms" value={activeClasses} />
          <StatCard icon={CheckCircle2} label="Completed missions" value={completedActivities} />
          <StatCard icon={Gauge} label="Overall progress" value={`${progressPercent}%`} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="mb-4 text-xl font-bold">Current quests</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {quests.length === 0 ? (
              <EmptyState
                actionHref="/student/classes"
                actionLabel="Open realms"
                description="Published quests from your enrolled realms will appear here."
                title="No active quests yet"
              />
            ) : (
              quests.map((quest) => {
                const completed = quest.activities.filter((link) =>
                  link.activity.progresses.some((progress) => progress.status === "COMPLETED")
                ).length;

                return (
                  <QuestCard
                    completed={completed}
                    key={quest.id}
                    title={quest.title}
                    total={quest.activities.length}
                    type={quest.type}
                    xpReward={quest.xpReward}
                  />
                );
              })
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-bold">Recent grades</h2>
          <div className="mt-4 space-y-3">
            {recentGrades.length === 0 ? (
              <EmptyState
                description="Published scores and feedback will appear after your lecturers release grades."
                title="No published grades yet"
              />
            ) : (
              recentGrades.map((grade) => (
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
