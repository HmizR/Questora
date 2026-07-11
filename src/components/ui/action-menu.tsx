type ActionMenuProps = {
  label: string;
  children: React.ReactNode;
};

export function ActionMenu({ label, children }: ActionMenuProps) {
  return (
    <details className="relative">
      <summary
        aria-label={label}
        className="inline-flex min-h-[30px] cursor-pointer list-none items-center rounded-md border border-ink/20 bg-white px-3 py-1.5 text-xs font-bold leading-none hover:bg-parchment"
      >
        ...
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-ink/10 bg-white p-1.5 shadow-lg">
        <div className="space-y-1">{children}</div>
      </div>
    </details>
  );
}
