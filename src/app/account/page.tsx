import Link from "next/link";

import {
  ChangeOwnPasswordForm,
  UpdateOwnProfileForm
} from "@/components/account/account-forms";
import { AvatarImage } from "@/components/ui/avatar-image";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { roleLabel, roleTone, statusLabel, statusTone } from "@/lib/user-display";

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
          <div className="flex items-center gap-4">
            <AvatarImage avatarUrl={user.avatarUrl} name={user.name} />
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Account details</h2>
              <p className="mt-1 truncate text-sm text-ink/60">{user.email}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <div className="rounded-md border border-ink/10 bg-parchment/50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Name</p>
              <p className="mt-1 break-words text-sm font-semibold text-ink">{user.name}</p>
            </div>
            <div className="rounded-md border border-ink/10 bg-parchment/50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Email</p>
              <p className="mt-1 break-words text-sm font-semibold text-ink">{user.email}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-ink/10 bg-parchment/50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Role</p>
                <div className="mt-1">
                  <StatusBadge tone={roleTone(user.role)}>{roleLabel(user.role)}</StatusBadge>
                </div>
              </div>
              <div className="rounded-md border border-ink/10 bg-parchment/50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Status</p>
                <div className="mt-1">
                  <StatusBadge tone={statusTone(user.status)}>{statusLabel(user.status)}</StatusBadge>
                </div>
              </div>
            </div>
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
