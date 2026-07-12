import { ChevronDown } from "lucide-react";

type ExpanderProps = {
  title: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function Expander({
  title,
  meta,
  children,
  defaultOpen = false,
  className = ""
}: ExpanderProps) {
  return (
    <details
      className={`group rounded-2xl border border-border/80 bg-surface shadow-sm ${className}`}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <div className="font-bold">{title}</div>
          {meta ? <div className="mt-1 text-sm text-ink/60">{meta}</div> : null}
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface-muted text-ink/60 transition group-open:rotate-180">
          <ChevronDown aria-hidden className="h-4 w-4" />
        </span>
      </summary>
      <div className="border-t border-border/80 p-5">{children}</div>
    </details>
  );
}
