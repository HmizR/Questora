import { AdminLinks } from "@/components/admin/admin-links";
import { CreateUserForm } from "@/components/admin/user-form";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireAdmin } from "@/lib/authorization-service";

export default async function NewUserPage() {
  await requireAdmin();

  return (
    <DashboardShell
      title="Create user"
      subtitle="Add a new admin, lecturer, or student account. Passwords are hashed before storage."
    >
      <AdminLinks />
      <CreateUserForm />
    </DashboardShell>
  );
}
