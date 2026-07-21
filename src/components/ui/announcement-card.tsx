import Link from "next/link";
import type { ReactNode } from "react";

import type { AnnouncementStatus } from "@prisma/client";
import { Megaphone } from "lucide-react";

import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

const statusLabels: Record<AnnouncementStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived"
};

type AnnouncementCardProps = {
  title: string;
  body: string;
  status?: AnnouncementStatus;
  publishedAt?: Date | null;
  createdAt: Date;
  authorName?: string;
  href?: string;
  actions?: ReactNode;
};

export function AnnouncementCard({
  title,
  body,
  status,
  publishedAt,
  createdAt,
  authorName,
  href,
  actions
}: AnnouncementCardProps) {
  const content = (
    <article className="rounded-xl border border-border/80 bg-surface p-5 shadow-sm transition hover:border-accent/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Megaphone aria-hidden className="h-4 w-4" />
            </span>
            <h2 className="truncate text-lg font-bold text-ink" title={title}>
              {title}
            </h2>
            {status ? (
              <StatusBadge tone={status === "PUBLISHED" ? "success" : status === "ARCHIVED" ? "neutral" : "warning"}>
                {statusLabels[status]}
              </StatusBadge>
            ) : null}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/75">{body}</p>
          <p className="mt-4 text-xs font-medium text-ink/55">
            {publishedAt ? `Published ${formatDateTime(publishedAt)}` : `Created ${formatDateTime(createdAt)}`}
            {authorName ? ` by ${authorName}` : ""}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
      </div>
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link className={cn("block rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50")} href={href}>
      {content}
    </Link>
  );
}
