import Link from "next/link";
import { ChevronDown, Menu, Sparkles, UserCircle } from "lucide-react";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/authorization-service";
import { AppNav } from "@/components/ui/app-nav";
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
                <UserCircle aria-hidden className="h-4 w-4 text-moss" />
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-36 truncate">{user.name}</span>
                  <span className="block max-w-36 truncate text-xs font-medium text-ink/55">
                    {user.email}
                  </span>
                </span>
                <ChevronDown aria-hidden className="h-4 w-4 text-ink/45" />
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border/80 bg-surface p-3 shadow-lg">
                <div className="border-b border-border/80 pb-3">
                  <p className="font-semibold">{user.name}</p>
                  <p className="mt-1 truncate text-sm text-ink/60">{user.email}</p>
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

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-border/80 bg-surface/65 px-4 py-6 lg:block">
          <div className="sticky top-24">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wide text-ink/45">
              Navigation
            </p>
            <AppNav role={user.role} />
          </div>
        </aside>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <header className="mb-6 rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-moss">Questora</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{subtitle}</p>
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
