"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";

import { markAllNotificationsReadAction } from "@/app/notifications/actions";
import { NotificationItem } from "@/components/notifications/notification-item";
import type {
  NotificationRecentResponse,
  NotificationView
} from "@/components/notifications/notification-types";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export function NotificationBell({
  initialNotifications,
  initialUnreadCount
}: {
  initialNotifications: NotificationView[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isPending, startTransition] = useTransition();

  async function refreshNotifications() {
    const response = await fetch("/api/notifications/recent", {
      cache: "no-store"
    });
    if (!response.ok) return;
    const payload = (await response.json()) as NotificationRecentResponse;
    setNotifications(payload.notifications);
    setUnreadCount(payload.unreadCount);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshNotifications();
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  function markAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      await refreshNotifications();
    });
  }

  return (
    <details className="group relative">
      <summary className="relative inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border/80 bg-surface text-sm font-semibold shadow-sm hover:bg-surface-muted">
        <Bell aria-hidden className="h-4 w-4" />
        <span className="sr-only">Open notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-ember px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border/80 bg-surface p-3 shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div>
            <p className="font-bold">Notifications</p>
            <p className="text-xs font-semibold text-ink/55">
              {unreadCount} unread update{unreadCount === 1 ? "" : "s"}
            </p>
          </div>
          <button
            className={cn(
              "rounded-md border border-border/80 bg-surface-muted px-2.5 py-1.5 text-xs font-bold hover:bg-ink hover:text-white",
              isPending && "opacity-70"
            )}
            disabled={isPending || unreadCount === 0}
            onClick={markAllRead}
            type="button"
          >
            Mark all read
          </button>
        </div>

        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <EmptyState
              description="Realm updates, submissions, and grades will appear here."
              title="No notifications yet"
            />
          ) : (
            notifications.map((notification) => (
              <NotificationItem compact key={notification.id} notification={notification} />
            ))
          )}
        </div>

        <Link
          className="mt-3 block rounded-lg border border-border/80 bg-surface-muted px-3 py-2 text-center text-sm font-bold hover:bg-ink hover:text-white"
          href="/notifications"
        >
          View all notifications
        </Link>
      </div>
    </details>
  );
}
