import { UserRole } from "@prisma/client";

import { AdminLinks } from "@/components/admin/admin-links";
import { CreateClassForm } from "@/components/admin/class-form";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireAdmin } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function NewClassPage() {
  await requireAdmin();

  const lecturers = await db.user.findMany({
    where: {
      role: UserRole.LECTURER,
      status: "ACTIVE"
    },
    orderBy: { name: "asc" }
  });

  return (
    <DashboardShell
      title="Create learning realm"
      subtitle="Set the class details and assign one lecturer for the MVP."
    >
      <AdminLinks />
      <CreateClassForm lecturers={lecturers} />
    </DashboardShell>
  );
}
