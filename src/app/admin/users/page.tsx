import Link from "next/link";

import { AdminLinks } from "@/components/admin/admin-links";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireAdmin } from "@/lib/authorization-service";
import { db } from "@/lib/db";

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
      <AdminLinks />
      <div className="mb-5 flex justify-end">
        <Link
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel"
          href="/admin/users/new"
        >
          New user
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-ink/70">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.status}</td>
                <td className="px-4 py-3 text-ink/60">{user.createdAt.toLocaleDateString()}</td>
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
    </DashboardShell>
  );
}
