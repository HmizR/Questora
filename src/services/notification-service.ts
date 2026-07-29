import { NotificationType, Prisma, UserStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

type DbClient = typeof db | Prisma.TransactionClient;

export type NotificationFilter = "all" | "unread" | "announcements" | "submissions" | "grades" | "missions";

export type NotificationPayload = {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  entityType?: string;
  entityId?: string;
  dedupeKey?: string;
};

const filterTypes: Record<Exclude<NotificationFilter, "all" | "unread">, NotificationType[]> = {
  announcements: [NotificationType.ANNOUNCEMENT_PUBLISHED],
  submissions: [NotificationType.SUBMISSION_SUBMITTED, NotificationType.SUBMISSION_RETURNED],
  grades: [NotificationType.GRADE_DRAFTED, NotificationType.GRADE_PUBLISHED],
  missions: [NotificationType.MISSION_PUBLISHED, NotificationType.RESOURCE_ADDED]
};

function notificationWhere(userId: string, filter: NotificationFilter = "all"): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = { recipientId: userId };

  if (filter === "unread") {
    where.readAt = null;
  } else if (filter !== "all") {
    where.type = { in: filterTypes[filter] };
  }

  return where;
}

export async function createNotification(
  payload: NotificationPayload,
  client: DbClient = db
) {
  try {
    return await client.notification.create({
      data: {
        recipientId: payload.recipientId,
        actorId: payload.actorId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        href: payload.href,
        entityType: payload.entityType,
        entityId: payload.entityId,
        dedupeKey: payload.dedupeKey
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }

    throw error;
  }
}

export async function createNotifications(
  payloads: NotificationPayload[],
  client: DbClient = db
) {
  if (payloads.length === 0) return { count: 0 };

  return client.notification.createMany({
    data: payloads.map((payload) => ({
      recipientId: payload.recipientId,
      actorId: payload.actorId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      href: payload.href,
      entityType: payload.entityType,
      entityId: payload.entityId,
      dedupeKey: payload.dedupeKey
    })),
    skipDuplicates: true
  });
}

export async function getActiveClassStudentIds(classId: string, client: DbClient = db) {
  const enrollments = await client.classStudent.findMany({
    where: {
      classId,
      status: "ACTIVE",
      student: { status: UserStatus.ACTIVE }
    },
    select: { studentId: true }
  });

  return enrollments.map((enrollment) => enrollment.studentId);
}

export async function getRecentNotifications(userId: string, take = 8) {
  return db.notification.findMany({
    where: { recipientId: userId },
    include: {
      actor: { select: { name: true, avatarUrl: true } }
    },
    orderBy: { createdAt: "desc" },
    take
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return db.notification.count({
    where: { recipientId: userId, readAt: null }
  });
}

export async function getNotificationsForUser(input: {
  userId: string;
  filter?: NotificationFilter;
  take?: number;
}) {
  return db.notification.findMany({
    where: notificationWhere(input.userId, input.filter),
    include: {
      actor: { select: { name: true, avatarUrl: true } }
    },
    orderBy: { createdAt: "desc" },
    take: input.take ?? 100
  });
}

export async function markNotificationRead(input: { userId: string; notificationId: string }) {
  const notification = await db.notification.findUnique({
    where: { id: input.notificationId },
    select: { recipientId: true }
  });

  if (!notification) {
    throw new AppError("NOT_FOUND", "Notification not found.");
  }

  if (notification.recipientId !== input.userId) {
    throw new AppError("FORBIDDEN", "You can only update your own notifications.");
  }

  return db.notification.update({
    where: { id: input.notificationId },
    data: { readAt: new Date() }
  });
}

export async function markAllNotificationsRead(userId: string) {
  return db.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() }
  });
}
