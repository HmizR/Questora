import Link from "next/link";

import {
  ChangeOwnPasswordForm,
  UpdateOwnProfileForm
} from "@/components/account/account-forms";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { requireUser } from "@/lib/authorization-service";
import { db } from "@/lib/db";

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
  const sessionUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });

  return (
    <DashboardShell
      title="Account settings"
      subtitle="Review your Questora account details and jump back into your role workspace."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Profile</h2>
            <UpdateOwnProfileForm user={user} />
          </section>
          <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Password</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Change your password using your current credentials. If you cannot sign in, ask an
              admin to reset your password.
            </p>
            <ChangeOwnPasswordForm />
          </section>
        </div>
        <aside className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Account details</h2>
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
          <h2 className="mt-6 text-lg font-bold">Quick links</h2>
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
            Email, role, and status remain admin-controlled for the MVP.
          </p>
        </aside>
      </div>
    </DashboardShell>
  );
}
