import { NextResponse } from "next/server";

import { requireUser } from "@/lib/authorization-service";
import {
  getRecentNotifications,
  getUnreadNotificationCount
} from "@/services/notification-service";

export async function GET() {
  const user = await requireUser();
  const [notifications, unreadCount] = await Promise.all([
    getRecentNotifications(user.id, 8),
    getUnreadNotificationCount(user.id)
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      href: notification.href,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
      actorName: notification.actor?.name ?? null,
      actorAvatarUrl: notification.actor?.avatarUrl ?? null
    }))
  });
}
