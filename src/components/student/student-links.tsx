import Link from "next/link";

export function StudentLinks({ classId }: { classId?: string }) {
  const links = classId
    ? [
        { href: "/student", label: "Dashboard" },
        { href: "/student/classes", label: "Realms" },
        { href: `/student/classes/${classId}`, label: "Missions" },
        { href: `/student/classes/${classId}/quests`, label: "Quests" },
        { href: "/student/profile", label: "Profile" }
      ]
    : [
        { href: "/student", label: "Dashboard" },
        { href: "/student/classes", label: "Realms" },
        { href: "/student/profile", label: "Profile" }
      ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
