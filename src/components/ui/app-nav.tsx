"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

function getRoleItems(role: UserRole): NavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/classes", label: "Classes / Realms" },
      { href: "/account", label: "Account" }
    ];
  }

  if (role === "LECTURER") {
    return [
      { href: "/lecturer", label: "Dashboard" },
      { href: "/lecturer/classes", label: "Classes / Realms" },
      { href: "/account", label: "Account" }
    ];
  }

  return [
    { href: "/student", label: "Dashboard" },
    { href: "/student/classes", label: "Realms" },
    { href: "/student/profile", label: "Profile" },
    { href: "/account", label: "Account" }
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
