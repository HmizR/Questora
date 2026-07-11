"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type ClassTabsProps = {
  role: "LECTURER" | "STUDENT";
  classId: string;
};

function getTabs({ role, classId }: ClassTabsProps) {
  if (role === "LECTURER") {
    return [
      { href: `/lecturer/classes/${classId}`, label: "Overview" },
      { href: `/lecturer/classes/${classId}/modules`, label: "Regions" },
      { href: `/lecturer/classes/${classId}/students`, label: "Students" },
      { href: `/lecturer/classes/${classId}/quests`, label: "Quests" },
      { href: `/lecturer/classes/${classId}/submissions`, label: "Submissions" }
    ];
  }

  return [
    { href: `/student/classes/${classId}`, label: "Missions" },
    { href: `/student/classes/${classId}/quests`, label: "Quests" }
  ];
}

function isActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  if (href.match(/\/student\/classes\/[^/]+$/)) {
    return pathname.startsWith(`${href}/activities/`);
  }

  return href.match(/\/lecturer\/classes\/[^/]+\/(?:modules|quests)$/)
    ? pathname.startsWith(`${href}/`)
    : false;
}

export function ClassTabs(props: ClassTabsProps) {
  const pathname = usePathname();
  const tabs = getTabs(props);

  return (
    <div className="mb-6 overflow-x-auto rounded-lg border border-ink/10 bg-white p-2 shadow-sm">
      <nav className="flex min-w-max gap-2">
        {tabs.map((tab) => (
          <Link
            className={cn(
              "rounded-md px-4 py-2 text-sm font-semibold transition",
              isActive(pathname, tab.href)
                ? "bg-ink text-white"
                : "border border-ink/10 text-ink/70 hover:bg-parchment hover:text-ink"
            )}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
