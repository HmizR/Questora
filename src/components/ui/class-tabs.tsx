"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, ClipboardList, ListChecks, Map, Trophy, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ClassTabsProps = {
  role: "LECTURER" | "STUDENT";
  classId: string;
};

function getTabs({ role, classId }: ClassTabsProps) {
  if (role === "LECTURER") {
    return [
      { href: `/lecturer/classes/${classId}`, label: "Overview", icon: BarChart3 },
      { href: `/lecturer/classes/${classId}/modules`, label: "Regions", icon: Map },
      { href: `/lecturer/classes/${classId}/students`, label: "Students", icon: UsersRound },
      { href: `/lecturer/classes/${classId}/quests`, label: "Quests", icon: Trophy },
      { href: `/lecturer/classes/${classId}/grades`, label: "Grades", icon: ClipboardList }
    ];
  }

  return [
    { href: `/student/classes/${classId}`, label: "Missions", icon: ListChecks },
    { href: `/student/classes/${classId}/quests`, label: "Quests", icon: Trophy },
    { href: `/student/classes/${classId}/grades`, label: "Grades", icon: ClipboardList },
    { href: `/student/classes/${classId}/leaderboard`, label: "Leaderboard", icon: BookOpen }
  ];
}

type Tab = ReturnType<typeof getTabs>[number] & { icon: LucideIcon };

function isActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  if (href.match(/\/student\/classes\/[^/]+$/)) {
    return pathname.startsWith(`${href}/activities/`);
  }

  if (href.match(/\/student\/classes\/[^/]+\/(?:quests|grades|leaderboard)$/)) {
    return pathname.startsWith(`${href}/`);
  }

  return href.match(/\/lecturer\/classes\/[^/]+\/(?:modules|quests|grades)$/)
    ? pathname.startsWith(`${href}/`)
    : false;
}

export function ClassTabs(props: ClassTabsProps) {
  const pathname = usePathname();
  const tabs = getTabs(props);

  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border border-border/80 bg-surface p-2 shadow-sm">
      <nav className="flex min-w-max gap-2">
        {(tabs as Tab[]).map((tab) => {
          const Icon = tab.icon;

          return (
            <Link
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                isActive(pathname, tab.href)
                  ? "bg-accent text-white shadow-sm"
                  : "border border-border/80 text-ink/70 hover:bg-surface-muted hover:text-ink"
              )}
              href={tab.href}
              key={tab.href}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
