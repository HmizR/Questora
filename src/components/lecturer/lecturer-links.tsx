import Link from "next/link";

export function LecturerLinks({ classId }: { classId?: string }) {
  const links = classId
    ? [
        { href: "/lecturer", label: "Dashboard" },
        { href: "/lecturer/classes", label: "Realms" },
        { href: `/lecturer/classes/${classId}`, label: "Overview" },
        { href: `/lecturer/classes/${classId}/modules`, label: "Regions" },
        { href: `/lecturer/classes/${classId}/students`, label: "Students" },
        { href: `/lecturer/classes/${classId}/quests`, label: "Quests" },
        { href: `/lecturer/classes/${classId}/submissions`, label: "Submissions" }
      ]
    : [
        { href: "/lecturer", label: "Dashboard" },
        { href: "/lecturer/classes", label: "Realms" }
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
