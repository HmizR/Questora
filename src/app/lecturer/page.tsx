import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function LecturerDashboardPage() {
  const user = await requireRole("LECTURER");
  const [classes, submissions] = await Promise.all([
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
    })
  ]);

  return (
    <DashboardShell
      title="Lecturer quest board"
      subtitle="Guide your assigned learning realms, publish missions, and review submissions."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Assigned realms" value={classes} />
        <StatCard label="Submissions" value={submissions} hint="Across your realms" />
      </div>
    </DashboardShell>
  );
}
