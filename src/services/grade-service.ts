import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { awardBadgeByName } from "@/services/xp-service";

export async function getOwnPublishedGrade(activityId: string, studentId: string) {
  const grade = await db.grade.findUnique({
    where: {
      activityId_studentId: {
        activityId,
        studentId
      }
    },
    include: {
      activity: true
    }
  });

  if (!grade || !grade.publishedAt) {
    throw new AppError("NOT_FOUND", "Published grade not found.");
  }

  return grade;
}

export async function publishGrade(gradeId: string, lecturerId: string) {
  return db.$transaction(async (tx) => {
    const grade = await tx.grade.findUnique({
      where: { id: gradeId },
      include: {
        activity: {
          include: {
            module: {
              include: {
                class: true
              }
            }
          }
        }
      }
    });

    if (!grade) {
      throw new AppError("NOT_FOUND", "Grade not found.");
    }

    if (grade.activity.module.class.lecturerId !== lecturerId) {
      throw new AppError("FORBIDDEN", "You can only publish grades for your classes.");
    }

    const published = await tx.grade.update({
      where: { id: gradeId },
      data: { publishedAt: new Date() }
    });

    if (
      grade.activity.maxScore &&
      new Prisma.Decimal(grade.score).equals(new Prisma.Decimal(grade.activity.maxScore))
    ) {
      await awardBadgeByName(tx, grade.studentId, "Perfect Score");
    }

    return published;
  });
}
