import { MoreHorizontal } from "lucide-react";

type ActionMenuProps = {
  label: string;
  children: React.ReactNode;
};

export function ActionMenu({ label, children }: ActionMenuProps) {
  return (
    <details className="relative">
      <summary
        aria-label={label}
        className="inline-flex min-h-[32px] cursor-pointer list-none items-center rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-bold leading-none shadow-sm hover:bg-surface-muted"
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-border/80 bg-surface p-1.5 shadow-lg">
        <div className="space-y-1">{children}</div>
      </div>
    </details>
  );
}
