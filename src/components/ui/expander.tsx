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
      className={`group rounded-lg border border-ink/10 bg-white shadow-sm ${className}`}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <div className="font-bold">{title}</div>
          {meta ? <div className="mt-1 text-sm text-ink/60">{meta}</div> : null}
        </div>
        <span className="shrink-0 rounded-md border border-ink/10 px-2 py-1 text-xs font-bold text-ink/60 transition group-open:rotate-180">
          v
        </span>
      </summary>
      <div className="border-t border-ink/10 p-5">{children}</div>
    </details>
  );
}
