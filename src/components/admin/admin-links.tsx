import Link from "next/link";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/classes", label: "Classes" }
];

export function AdminLinks() {
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
