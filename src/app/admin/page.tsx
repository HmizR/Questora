import { ClassStatus, UserRole } from "@prisma/client";
import { BookOpen, GraduationCap, UsersRound, UserRound } from "lucide-react";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authorization-service";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [totalUsers, lecturers, students, activeClasses] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: UserRole.LECTURER } }),
    db.user.count({ where: { role: UserRole.STUDENT } }),
    db.class.count({ where: { status: ClassStatus.ACTIVE } })
  ]);

  return (
    <DashboardShell
      title="Admin command hall"
      subtitle="Manage users, learning realms, lecturer assignments, and enrollment from here."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={UsersRound} label="Total users" value={totalUsers} />
        <StatCard icon={GraduationCap} label="Lecturers" value={lecturers} />
        <StatCard icon={UserRound} label="Students" value={students} />
        <StatCard icon={BookOpen} label="Active realms" value={activeClasses} />
      </div>
    </DashboardShell>
  );
}
