import { CalendarClock } from "lucide-react";
import Link from "next/link";

import { deadlineStateLabel, type DeadlineState } from "@/lib/deadlines";
import { formatDate } from "@/lib/date-format";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";

const toneByState: Record<DeadlineState, StatusBadgeTone> = {
  overdue: "danger",
  "due-today": "warning",
  "due-soon": "info",
  future: "neutral",
  "no-date": "neutral"
};

export function DeadlineBadge({ state }: { state: DeadlineState }) {
  return <StatusBadge tone={toneByState[state]}>{deadlineStateLabel(state)}</StatusBadge>;
}

export function DeadlineCard({
  title,
  context,
  dueAt,
  state,
  href,
  meta
}: {
  title: string;
  context: string;
  dueAt: Date;
  state: DeadlineState;
  href: string;
  meta?: string;
}) {
  return (
    <Link
      className="flex gap-3 rounded-lg border border-border/80 bg-surface p-4 text-sm shadow-sm transition hover:border-moss/50 hover:bg-surface-muted"
      href={href}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-moss">
        <CalendarClock aria-hidden className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <DeadlineBadge state={state} />
          <span className="font-semibold">{formatDate(dueAt)}</span>
        </span>
        <span className="mt-2 block font-bold">{title}</span>
        <span className="mt-1 block text-ink/60">{context}</span>
        {meta ? <span className="mt-1 block text-xs font-semibold text-ink/50">{meta}</span> : null}
      </span>
    </Link>
  );
}
