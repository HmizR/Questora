import { BookOpen, CalendarClock, CheckCircle2, Gauge } from "lucide-react";

import { QuestCard } from "@/components/gamification/quest-card";
import { LevelProgress } from "@/components/gamification/level-progress";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { DeadlineCard } from "@/components/ui/deadline-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { getStudentDeadlineItems } from "@/services/deadline-service";

export default async function StudentDashboardPage() {
  const user = await requireRole("STUDENT");
  const [profile, activeClasses, recentGrades, publishedActivities, completedActivities, quests, deadlines] =
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
    }),
    getStudentDeadlineItems({ studentId: user.id })
  ]);

  const totalXp = profile?.totalXp ?? 0;
  const progressPercent =
    publishedActivities > 0 ? Math.round((completedActivities / publishedActivities) * 100) : 0;
  const dueSoon = deadlines
    .filter((item) => item.state === "due-today" || item.state === "due-soon")
    .slice(0, 5);
  const overdue = deadlines.filter((item) => item.state === "overdue").slice(0, 5);

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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <CalendarClock aria-hidden className="h-5 w-5 text-moss" />
            Due soon
          </h2>
          <div className="grid gap-3">
            {dueSoon.length === 0 ? (
              <EmptyState
                description="Missions due in the next 7 days will appear here."
                title="No urgent deadlines"
              />
            ) : (
              dueSoon.map((item) => (
                <DeadlineCard
                  context={`${item.className} - ${item.moduleTitle}`}
                  dueAt={item.dueAt}
                  href={item.href}
                  key={item.activityId}
                  meta={item.type}
                  state={item.state}
                  title={item.title}
                />
              ))
            )}
          </div>
        </section>
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <CalendarClock aria-hidden className="h-5 w-5 text-ember" />
            Overdue
          </h2>
          <div className="grid gap-3">
            {overdue.length === 0 ? (
              <EmptyState
                description="Past-due missions that still need action will appear here."
                title="No overdue missions"
              />
            ) : (
              overdue.map((item) => (
                <DeadlineCard
                  context={`${item.className} - ${item.moduleTitle}`}
                  dueAt={item.dueAt}
                  href={item.href}
                  key={item.activityId}
                  meta={item.type}
                  state={item.state}
                  title={item.title}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
