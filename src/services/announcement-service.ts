import { AnnouncementStatus, EnrollmentStatus } from "@prisma/client";

import { nextAnnouncementPublishedAt } from "@/lib/announcement-rules";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

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

  return db.announcement.create({
    data: {
      classId: input.classId,
      title: input.title,
      body: input.body,
      status: input.status,
      createdById: input.lecturerId,
      publishedAt: nextAnnouncementPublishedAt({ status: input.status })
    }
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

  return db.announcement.update({
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
}

export async function publishAnnouncement(input: {
  lecturerId: string;
  classId: string;
  announcementId: string;
}) {
  const announcement = await getAnnouncementForLecturer(input);

  return db.announcement.update({
    where: { id: input.announcementId },
    data: {
      status: AnnouncementStatus.PUBLISHED,
      publishedAt: nextAnnouncementPublishedAt({
        status: AnnouncementStatus.PUBLISHED,
        previousPublishedAt: announcement.publishedAt
      })
    }
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
