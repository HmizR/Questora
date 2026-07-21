import Link from "next/link";
import { ChevronDown, Menu, Sparkles } from "lucide-react";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { AppNav } from "@/components/ui/app-nav";
import { AvatarImage } from "@/components/ui/avatar-image";
import { DashboardFrame } from "@/components/ui/dashboard-frame";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type DashboardShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const roleLabels = {
  ADMIN: "Admin",
  LECTURER: "Lecturer",
  STUDENT: "Student"
} as const;

export async function DashboardShell({ title, subtitle, children }: DashboardShellProps) {
  const user = await requireUser();
  const currentUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      avatarUrl: true,
      email: true,
      name: true
    }
  });
  const displayName = currentUser?.name ?? user.name ?? "User";
  const displayEmail = currentUser?.email ?? user.email ?? "";

  return (
    <div className="min-h-screen bg-parchment">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/90 backdrop-blur-xl">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <details className="group lg:hidden">
              <summary className="inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border/80 bg-surface text-sm font-semibold shadow-sm">
                <Menu aria-hidden className="h-4 w-4" />
                <span className="sr-only">Open navigation</span>
              </summary>
              <div className="absolute left-4 right-4 top-14 rounded-xl border border-border/80 bg-surface p-3 shadow-lg">
                <AppNav role={user.role} />
              </div>
            </details>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
              <Sparkles aria-hidden className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none">Questora</p>
              <p className="mt-1 hidden text-xs font-semibold uppercase tracking-wide text-moss sm:block">
                {roleLabels[user.role]} Realm Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink/70 sm:inline-block">
              {user.role}
            </span>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border/80 bg-surface px-3 py-2 text-left text-sm font-semibold shadow-sm hover:bg-surface-muted">
                <AvatarImage avatarUrl={currentUser?.avatarUrl} name={displayName} size="sm" />
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-36 truncate">{displayName}</span>
                  <span className="block max-w-36 truncate text-xs font-medium text-ink/55">
                    {displayEmail}
                  </span>
                </span>
                <ChevronDown aria-hidden className="h-4 w-4 text-ink/45" />
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border/80 bg-surface p-3 shadow-lg">
                <div className="border-b border-border/80 pb-3">
                  <p className="font-semibold">{displayName}</p>
                  <p className="mt-1 truncate text-sm text-ink/60">{displayEmail}</p>
                </div>
                <Link
                  className="mt-3 block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface-muted"
                  href="/account"
                >
                  Account Settings
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-ember hover:bg-ember/10">
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <DashboardFrame role={user.role}>
        <header className="mb-6 rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">Questora</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{subtitle}</p>
        </header>
        {children}
      </DashboardFrame>
    </div>
  );
}
