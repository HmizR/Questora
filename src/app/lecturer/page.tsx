import { BookOpen, CalendarClock, Inbox } from "lucide-react";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { DeadlineCard } from "@/components/ui/deadline-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { getLecturerDeadlineItems, getLecturerOverdueWork } from "@/services/deadline-service";

export default async function LecturerDashboardPage() {
  const user = await requireRole("LECTURER");
  const [classes, submissions, deadlines, overdueWork] = await Promise.all([
    db.class.count({ where: { lecturerId: user.id } }),
    db.submission.count({
      where: {
        activity: {
          module: {
            class: {
              lecturerId: user.id
            }
          }
        }
      }
    }),
    getLecturerDeadlineItems({ lecturerId: user.id }),
    getLecturerOverdueWork({ lecturerId: user.id })
  ]);
  const dueSoon = deadlines
    .filter((item) => item.state === "due-today" || item.state === "due-soon")
    .slice(0, 5);
  const overdue = overdueWork.slice(0, 5);

  return (
    <DashboardShell
      title="Lecturer quest board"
      subtitle="Guide your assigned learning realms, publish missions, and review submissions."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Assigned realms" value={classes} />
        <StatCard icon={Inbox} label="Submissions" value={submissions} hint="Across your realms" />
        <StatCard icon={CalendarClock} label="Due soon" value={dueSoon.length} hint="Next 7 days" />
        <StatCard icon={CalendarClock} label="Overdue work" value={overdueWork.length} hint="Student action needed" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-bold">Upcoming deadlines</h2>
          <div className="grid gap-3">
            {dueSoon.length === 0 ? (
              <EmptyState
                description="Published mission deadlines in the next 7 days will appear here."
                title="No upcoming deadlines"
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
          <h2 className="mb-4 text-xl font-bold">Overdue work</h2>
          <div className="grid gap-3">
            {overdue.length === 0 ? (
              <EmptyState
                description="Missing submissions and overdue quizzes will appear here."
                title="No overdue work"
              />
            ) : (
              overdue.map((item) => (
                <DeadlineCard
                  context={`${item.studentName} - ${item.className}`}
                  dueAt={item.dueAt}
                  href={item.href}
                  key={`${item.activityId}-${item.studentId}`}
                  meta={item.reason === "missing-submission" ? "Missing submission" : "Quiz not passed"}
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
