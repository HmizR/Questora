"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Trophy,
  UserRound,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function getRoleItems(role: UserRole): NavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: UsersRound },
      { href: "/admin/classes", label: "Classes / Realms", icon: BookOpen },
      { href: "/account", label: "Account", icon: Settings }
    ];
  }

  if (role === "LECTURER") {
    return [
      { href: "/lecturer", label: "Dashboard", icon: LayoutDashboard },
      { href: "/lecturer/classes", label: "Classes / Realms", icon: GraduationCap },
      { href: "/account", label: "Account", icon: Settings }
    ];
  }

  return [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/classes", label: "Realms", icon: BookOpen },
    { href: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/student/profile", label: "Profile", icon: UserRound },
    { href: "/account", label: "Account", icon: Settings }
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/account" || href === "/admin" || href === "/lecturer" || href === "/student") {
    return pathname === href;
  }

  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function AppNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = getRoleItems(role);

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              isActive(pathname, item.href)
                ? "bg-accent text-white shadow-sm"
                : "text-ink/70 hover:bg-surface-muted hover:text-ink"
            )}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
