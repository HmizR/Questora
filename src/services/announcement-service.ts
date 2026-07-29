import { AnnouncementStatus, EnrollmentStatus, NotificationType } from "@prisma/client";

import { nextAnnouncementPublishedAt } from "@/lib/announcement-rules";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  createNotifications,
  getActiveClassStudentIds
} from "@/services/notification-service";

async function getClassForLecturer(classId: string, lecturerId: string) {
  const teachingClass = await db.class.findUnique({ where: { id: classId } });
  if (!teachingClass) {
    throw new AppError("NOT_FOUND", "Class not found.");
  }

  if (teachingClass.lecturerId !== lecturerId) {
    throw new AppError("FORBIDDEN", "You can only manage announcements in your own realms.");
  }

  return teachingClass;
}

async function getAnnouncementForLecturer(input: {
  announcementId: string;
  classId: string;
  lecturerId: string;
}) {
  const announcement = await db.announcement.findUnique({
    where: { id: input.announcementId },
    include: { class: true }
  });

  if (!announcement || announcement.classId !== input.classId) {
    throw new AppError("NOT_FOUND", "Announcement not found.");
  }

  if (announcement.class.lecturerId !== input.lecturerId) {
    throw new AppError("FORBIDDEN", "You can only manage announcements in your own realms.");
  }

  return announcement;
}

export async function createAnnouncement(input: {
  lecturerId: string;
  classId: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
}) {
  await getClassForLecturer(input.classId, input.lecturerId);

  return db.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        classId: input.classId,
        title: input.title,
        body: input.body,
        status: input.status,
        createdById: input.lecturerId,
        publishedAt: nextAnnouncementPublishedAt({ status: input.status })
      }
    });

    if (announcement.status === AnnouncementStatus.PUBLISHED) {
      const studentIds = await getActiveClassStudentIds(input.classId, tx);
      await createNotifications(
        studentIds.map((studentId) => ({
          recipientId: studentId,
          actorId: input.lecturerId,
          type: NotificationType.ANNOUNCEMENT_PUBLISHED,
          title: "New realm announcement",
          body: announcement.title,
          href: `/student/classes/${input.classId}/announcements`,
          entityType: "Announcement",
          entityId: announcement.id,
          dedupeKey: `announcement:${announcement.id}:published:student:${studentId}`
        })),
        tx
      );
    }

    return announcement;
  });
}

export async function updateAnnouncement(input: {
  lecturerId: string;
  classId: string;
  announcementId: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
}) {
  const announcement = await getAnnouncementForLecturer(input);

  return db.$transaction(async (tx) => {
    const updated = await tx.announcement.update({
      where: { id: input.announcementId },
      data: {
        title: input.title,
        body: input.body,
        status: input.status,
        publishedAt: nextAnnouncementPublishedAt({
          status: input.status,
          previousPublishedAt: announcement.publishedAt
        })
      }
    });

    if (updated.status === AnnouncementStatus.PUBLISHED && !announcement.publishedAt) {
      const studentIds = await getActiveClassStudentIds(input.classId, tx);
      await createNotifications(
        studentIds.map((studentId) => ({
          recipientId: studentId,
          actorId: input.lecturerId,
          type: NotificationType.ANNOUNCEMENT_PUBLISHED,
          title: "New realm announcement",
          body: updated.title,
          href: `/student/classes/${input.classId}/announcements`,
          entityType: "Announcement",
          entityId: updated.id,
          dedupeKey: `announcement:${updated.id}:published:student:${studentId}`
        })),
        tx
      );
    }

    return updated;
  });
}

export async function publishAnnouncement(input: {
  lecturerId: string;
  classId: string;
  announcementId: string;
}) {
  const announcement = await getAnnouncementForLecturer(input);

  return db.$transaction(async (tx) => {
    const published = await tx.announcement.update({
      where: { id: input.announcementId },
      data: {
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: nextAnnouncementPublishedAt({
          status: AnnouncementStatus.PUBLISHED,
          previousPublishedAt: announcement.publishedAt
        })
      }
    });

    if (!announcement.publishedAt) {
      const studentIds = await getActiveClassStudentIds(input.classId, tx);
      await createNotifications(
        studentIds.map((studentId) => ({
          recipientId: studentId,
          actorId: input.lecturerId,
          type: NotificationType.ANNOUNCEMENT_PUBLISHED,
          title: "New realm announcement",
          body: published.title,
          href: `/student/classes/${input.classId}/announcements`,
          entityType: "Announcement",
          entityId: published.id,
          dedupeKey: `announcement:${published.id}:published:student:${studentId}`
        })),
        tx
      );
    }

    return published;
  });
}

export async function archiveAnnouncement(input: {
  lecturerId: string;
  classId: string;
  announcementId: string;
}) {
  await getAnnouncementForLecturer(input);

  return db.announcement.update({
    where: { id: input.announcementId },
    data: { status: AnnouncementStatus.ARCHIVED }
  });
}

export async function deleteAnnouncement(input: {
  lecturerId: string;
  classId: string;
  announcementId: string;
}) {
  await getAnnouncementForLecturer(input);

  return db.announcement.delete({ where: { id: input.announcementId } });
}

export async function getPublishedAnnouncementsForStudent(input: {
  studentId: string;
  classId: string;
  take?: number;
}) {
  const enrollment = await db.classStudent.findUnique({
    where: {
      classId_studentId: {
        classId: input.classId,
        studentId: input.studentId
      }
    }
  });

  if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new AppError("FORBIDDEN", "You can only view announcements for realms you are enrolled in.");
  }

  return db.announcement.findMany({
    where: {
      classId: input.classId,
      status: AnnouncementStatus.PUBLISHED,
      publishedAt: { not: null }
    },
    include: {
      createdBy: { select: { name: true, avatarUrl: true } }
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: input.take
  });
}
