"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  FileText,
  Megaphone,
  RotateCcw
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NotificationType } from "@prisma/client";

import { markNotificationReadAction } from "@/app/notifications/actions";
import { AvatarImage } from "@/components/ui/avatar-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { NotificationView } from "@/components/notifications/notification-types";

const typeMeta: Record<NotificationType, { label: string; icon: LucideIcon }> = {
  ANNOUNCEMENT_PUBLISHED: { label: "Announcement", icon: Megaphone },
  SUBMISSION_SUBMITTED: { label: "Submission", icon: FileText },
  SUBMISSION_RETURNED: { label: "Returned", icon: RotateCcw },
  GRADE_DRAFTED: { label: "Grade", icon: FileCheck2 },
  GRADE_PUBLISHED: { label: "Grade", icon: CheckCircle2 },
  MISSION_PUBLISHED: { label: "Mission", icon: BookOpen },
  RESOURCE_ADDED: { label: "Resource", icon: Bell }
};

function relativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationItem({
  compact = false,
  notification
}: {
  compact?: boolean;
  notification: NotificationView;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const meta = typeMeta[notification.type];
  const Icon = meta.icon;
  const isUnread = !notification.readAt;

  function openNotification() {
    startTransition(async () => {
      if (isUnread) {
        await markNotificationReadAction(notification.id);
      }
      router.push(notification.href);
      router.refresh();
    });
  }

  return (
    <button
      className={cn(
        "group w-full rounded-xl border p-3 text-left transition hover:border-accent/40 hover:bg-surface-muted",
        isUnread ? "border-accent/30 bg-accent/5" : "border-border/80 bg-surface",
        compact ? "p-3" : "p-4",
        isPending && "opacity-70"
      )}
      disabled={isPending}
      onClick={openNotification}
      type="button"
    >
      <span className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink/70 group-hover:text-accent">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold">{notification.title}</span>
            {isUnread ? <StatusBadge tone="info">Unread</StatusBadge> : null}
            <StatusBadge>{meta.label}</StatusBadge>
          </span>
          <span
            className={cn(
              "mt-1 block text-sm leading-5 text-ink/65",
              compact ? "line-clamp-2" : "line-clamp-3"
            )}
          >
            {notification.body}
          </span>
          <span className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-ink/50">
            {notification.actorName ? (
              <>
                <AvatarImage
                  avatarUrl={notification.actorAvatarUrl}
                  name={notification.actorName}
                  size="sm"
                />
                <span className="truncate">{notification.actorName}</span>
                <span aria-hidden>|</span>
              </>
            ) : null}
            <span>{relativeTime(notification.createdAt)}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
