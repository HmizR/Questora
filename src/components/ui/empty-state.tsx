import Link from "next/link";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface p-6 text-center shadow-sm">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-moss">
        <Inbox aria-hidden className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/65">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          className="mt-4 inline-flex rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-steel"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
