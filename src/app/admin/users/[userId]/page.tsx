import { notFound } from "next/navigation";

import {
  DeactivateUserForm,
  ResetUserPasswordForm,
  UpdateUserForm
} from "@/components/admin/user-form";
import { AvatarImage } from "@/components/ui/avatar-image";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/authorization-service";
import { formatDateTime } from "@/lib/date-format";
import { db } from "@/lib/db";
import { roleLabel, roleTone, statusLabel, statusTone } from "@/lib/user-display";

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

  const summary =
    user.role === "LECTURER"
      ? {
          label: "Assigned realms",
          value: await db.class.count({ where: { lecturerId: user.id } })
        }
      : user.role === "STUDENT"
        ? {
            label: "Active enrollments",
            value: await db.classStudent.count({
              where: { studentId: user.id, status: "ACTIVE" }
            })
          }
        : {
            label: "Created realms",
            value: await db.class.count({ where: { createdById: user.id } })
          };

  return (
    <DashboardShell
      title="Edit user"
      subtitle="Update account details, role, and status. Use deactivation when access should be revoked."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <AvatarImage avatarUrl={user.avatarUrl} name={user.name} />
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold" title={user.name}>
                    {user.name}
                  </h2>
                  <p className="mt-1 truncate text-sm text-ink/60" title={user.email}>
                    {user.email}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone={roleTone(user.role)}>{roleLabel(user.role)}</StatusBadge>
                    <StatusBadge tone={statusTone(user.status)}>
                      {statusLabel(user.status)}
                    </StatusBadge>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/80 bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase text-ink/45">{summary.label}</p>
                <p className="mt-1 text-2xl font-bold">{summary.value}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-ink/10 bg-parchment/50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-ink/45">Created</p>
                <p className="mt-1 text-sm font-semibold">{formatDateTime(user.createdAt)}</p>
              </div>
              <div className="rounded-md border border-ink/10 bg-parchment/50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-ink/45">Updated</p>
                <p className="mt-1 text-sm font-semibold">{formatDateTime(user.updatedAt)}</p>
              </div>
            </div>
          </section>
          <UpdateUserForm user={user} />
        </div>
        <aside className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Account control</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Deactivation keeps historical records while preventing sign-in.
          </p>
          <div className="mt-5">
            <DeactivateUserForm userId={user.id} />
          </div>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink/55">
            Password reset
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Questora does not email password resets in this MVP. Set a temporary password and
            share it with the user outside Questora.
          </p>
          <ResetUserPasswordForm userId={user.id} />
        </aside>
      </div>
    </DashboardShell>
  );
}
