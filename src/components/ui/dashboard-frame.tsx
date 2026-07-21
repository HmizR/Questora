"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { UserRole } from "@prisma/client";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { AppNav } from "@/components/ui/app-nav";
import { cn } from "@/lib/utils";

const sidebarStorageKey = "questora-sidebar-collapsed";

export function DashboardFrame({
  children,
  role
}: {
  children: ReactNode;
  role: UserRole;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(sidebarStorageKey) === "true");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(sidebarStorageKey, String(next));
      return next;
    });
  }

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div
      className={cn(
        "grid min-h-[calc(100vh-4rem)] transition-[grid-template-columns] duration-200",
        collapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[260px_1fr]"
      )}
    >
      <aside
        className={cn(
          "hidden border-r border-border/80 bg-surface/65 py-6 transition-[padding] duration-200 lg:block",
          collapsed ? "px-3" : "px-4"
        )}
      >
        <div className="sticky top-24">
          <div className={cn("mb-3 flex items-center", collapsed ? "justify-center" : "justify-between gap-2 px-3")}>
            <p className={cn("text-xs font-bold uppercase tracking-wide text-ink/45", collapsed && "sr-only")}>
              Navigation
            </p>
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-surface text-ink/70 shadow-sm transition hover:bg-surface-muted hover:text-ink"
              onClick={toggleSidebar}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              <ToggleIcon aria-hidden className="h-4 w-4" />
            </button>
          </div>
          <AppNav collapsed={collapsed} role={role} />
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          {children}
        </div>
      </main>
    </div>
  );
}
