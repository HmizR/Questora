import Link from "next/link";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireUser } from "@/lib/authorization-service";

const roleHome = {
  ADMIN: "/admin",
  LECTURER: "/lecturer",
  STUDENT: "/student"
} as const;

const rolePrimary = {
  ADMIN: "/admin/classes",
  LECTURER: "/lecturer/classes",
  STUDENT: "/student/classes"
} as const;

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <DashboardShell
      title="Account settings"
      subtitle="Review your Questora account details and jump back into your role workspace."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Profile</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Name", user.name ?? "Unnamed user"],
              ["Role", user.role],
              ["Email", user.email ?? "No email"],
              ["Status", user.status]
            ].map(([label, value]) => (
              <div className="rounded-md border border-ink/10 bg-parchment/50 px-4 py-3" key={label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Quick links</h2>
          <div className="mt-4 grid gap-3">
            <Link
              className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-ink hover:text-white"
              href={roleHome[user.role]}
            >
              Dashboard
            </Link>
            <Link
              className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-ink hover:text-white"
              href={rolePrimary[user.role]}
            >
              {user.role === "ADMIN" ? "Manage realms" : "My realms"}
            </Link>
          </div>
          <p className="mt-5 text-sm leading-6 text-ink/60">
            Profile editing is intentionally minimal for the MVP. Admins can update platform users
            from the user management area.
          </p>
        </aside>
      </div>
    </DashboardShell>
  );
}
