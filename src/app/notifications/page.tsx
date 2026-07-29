import Link from "next/link";

import { markAllNotificationsReadAction } from "@/app/notifications/actions";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { NotificationFilter } from "@/services/notification-service";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/authorization-service";
import {
  getNotificationsForUser,
  getUnreadNotificationCount
} from "@/services/notification-service";

const filters: Array<{ label: string; value: NotificationFilter }> = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Announcements", value: "announcements" },
  { label: "Submissions", value: "submissions" },
  { label: "Grades", value: "grades" },
  { label: "Missions", value: "missions" }
];

async function markAllReadFromPage() {
  "use server";
  await markAllNotificationsReadAction();
}

function parseFilter(value: string | string[] | undefined): NotificationFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return filters.some((filter) => filter.value === raw) ? (raw as NotificationFilter) : "all";
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const activeFilter = parseFilter(params.filter);
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser({ userId: user.id, filter: activeFilter, take: 100 }),
    getUnreadNotificationCount(user.id)
  ]);

  return (
    <DashboardShell
      title="Notifications"
      subtitle="Updates from your realms, missions, submissions, and grades."
    >
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Link
              className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                activeFilter === filter.value
                  ? "border-ink bg-ink text-white"
                  : "border-border/80 bg-surface-muted text-ink/70 hover:bg-ink hover:text-white"
              }`}
              href={filter.value === "all" ? "/notifications" : `/notifications?filter=${filter.value}`}
              key={filter.value}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <form action={markAllReadFromPage}>
          <button
            className="rounded-lg border border-border/80 bg-surface-muted px-3 py-2 text-sm font-bold hover:bg-ink hover:text-white disabled:opacity-60"
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Notification history</h2>
            <p className="mt-1 text-sm text-ink/60">
              Showing {notifications.length} update{notifications.length === 1 ? "" : "s"}.
            </p>
          </div>
          {unreadCount > 0 ? <StatusBadge tone="info">{unreadCount} unread</StatusBadge> : null}
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            description="Updates from class activity, submissions, grades, and announcements will appear here."
            title="No notifications found"
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={{
                  id: notification.id,
                  type: notification.type,
                  title: notification.title,
                  body: notification.body,
                  href: notification.href,
                  readAt: notification.readAt?.toISOString() ?? null,
                  createdAt: notification.createdAt.toISOString(),
                  actorName: notification.actor?.name ?? null,
                  actorAvatarUrl: notification.actor?.avatarUrl ?? null
                }}
              />
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
