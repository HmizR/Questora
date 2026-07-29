import type { NotificationType } from "@prisma/client";

export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
  actorName: string | null;
  actorAvatarUrl: string | null;
};

export type NotificationRecentResponse = {
  unreadCount: number;
  notifications: NotificationView[];
};
