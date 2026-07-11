"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

function getClassId(pathname: string) {
  const match = pathname.match(/^\/(?:lecturer|student)\/classes\/([^/]+)/);
  return match?.[1];
}

function getRoleItems(role: UserRole, pathname: string): NavItem[] {
  const classId = getClassId(pathname);

  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/classes", label: "Classes / Realms" },
      { href: "/account", label: "Account" }
    ];
  }

  if (role === "LECTURER") {
    const items = [
      { href: "/lecturer", label: "Dashboard" },
      { href: "/lecturer/classes", label: "Classes / Realms" }
    ];

    if (classId) {
      items.push(
        { href: `/lecturer/classes/${classId}`, label: "Overview" },
        { href: `/lecturer/classes/${classId}/modules`, label: "Regions" },
        { href: `/lecturer/classes/${classId}/students`, label: "Students" },
        { href: `/lecturer/classes/${classId}/quests`, label: "Quests" },
        { href: `/lecturer/classes/${classId}/submissions`, label: "Submissions" }
      );
    }

    items.push({ href: "/account", label: "Account" });
    return items;
  }

  const items = [
    { href: "/student", label: "Dashboard" },
    { href: "/student/classes", label: "Realms" }
  ];

  if (classId) {
    items.push(
      { href: `/student/classes/${classId}`, label: "Missions" },
      { href: `/student/classes/${classId}/quests`, label: "Quests" }
    );
  }

  items.push({ href: "/student/profile", label: "Profile" }, { href: "/account", label: "Account" });
  return items;
}

function isActive(pathname: string, href: string) {
  if (href === "/account") {
    return pathname === href;
  }

  return pathname === href;
}

export function AppNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = getRoleItems(role, pathname);

  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <Link
          className={cn(
            "block rounded-md px-3 py-2 text-sm font-semibold transition",
            isActive(pathname, item.href)
              ? "bg-ink text-white"
              : "text-ink/70 hover:bg-parchment hover:text-ink"
          )}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
