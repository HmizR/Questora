import Link from "next/link";

import { AvatarImage } from "@/components/ui/avatar-image";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/authorization-service";
import { formatDate } from "@/lib/date-format";
import { db } from "@/lib/db";
import { roleLabel, roleTone, statusLabel, statusTone } from "@/lib/user-display";
import { cn } from "@/lib/utils";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });

  return (
    <DashboardShell
      title="User roster"
      subtitle="Create, edit, and deactivate platform accounts for the MVP roles."
    >
      <div className="mb-5 flex justify-end">
        <Link
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel"
          href="/admin/users/new"
        >
          New user
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
        {users.length === 0 ? (
          <div className="p-6">
            <EmptyState
              actionHref="/admin/users/new"
              actionLabel="New user"
              description="Create the first Questora account before assigning realms or enrollments."
              title="No users yet"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {users.map((user) => (
                  <tr
                    className={cn(
                      "transition",
                      user.status === "ACTIVE" ? "hover:bg-parchment/40" : "bg-ink/[0.03] text-ink/60"
                    )}
                    key={user.id}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <AvatarImage avatarUrl={user.avatarUrl} name={user.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink" title={user.name}>
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-ink/60" title={user.email}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={roleTone(user.role)}>{roleLabel(user.role)}</StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(user.status)}>{statusLabel(user.status)}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-ink/60">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-moss hover:underline" href={`/admin/users/${user.id}`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
