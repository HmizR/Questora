import { notFound } from "next/navigation";

import { DeactivateUserForm, UpdateUserForm } from "@/components/admin/user-form";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireAdmin } from "@/lib/authorization-service";
import { db } from "@/lib/db";

export default async function EditUserPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    notFound();
  }

  return (
    <DashboardShell
      title="Edit user"
      subtitle="Update account details, role, and status. Use deactivation when access should be revoked."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <UpdateUserForm user={user} />
        <aside className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Account control</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Deactivation keeps historical records while preventing sign-in.
          </p>
          <div className="mt-5">
            <DeactivateUserForm userId={user.id} />
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
