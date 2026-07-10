import { EnrollmentStatus, Prisma, ProgressStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { awardBadgeByName, awardQuestXp } from "@/services/xp-service";
import { isQuestCompleteForStudent } from "@/services/quest-service";

type Tx = Prisma.TransactionClient;

export async function assertStudentCanAccessActivity(activityId: string, studentId: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    include: {
      module: {
        include: {
          class: true
        }
      },
      prerequisites: {
        include: {
          requiredActivity: {
            include: {
              progresses: {
                where: { studentId }
              }
            }
          }
        }
      }
    }
  });

  if (!activity) {
    throw new AppError("NOT_FOUND", "Activity not found.");
  }

  const enrollment = await db.classStudent.findUnique({
    where: {
      classId_studentId: {
        classId: activity.module.classId,
        studentId
      }
    }
  });

  if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new AppError("FORBIDDEN", "You are not enrolled in this class.");
  }

  if (!activity.module.isPublished || !activity.isPublished) {
    throw new AppError("FORBIDDEN", "This mission is not available yet.");
  }

  if (activity.module.availableFrom && activity.module.availableFrom > new Date()) {
    throw new AppError("FORBIDDEN", "This region is not available yet.");
  }

  for (const prerequisite of activity.prerequisites) {
    const progress = prerequisite.requiredActivity.progresses[0];
    if (!progress || progress.status !== ProgressStatus.COMPLETED) {
      throw new AppError("FORBIDDEN", "Complete the prerequisite mission first.");
    }

    if (
      prerequisite.minimumScore &&
      (!progress.bestScore || Number(progress.bestScore) < Number(prerequisite.minimumScore))
    ) {
      throw new AppError("FORBIDDEN", "The prerequisite score requirement is not met.");
    }
  }

  return activity;
}

export async function completeActivity(activityId: string, studentId: string) {
  await assertStudentCanAccessActivity(activityId, studentId);

  return db.$transaction(async (tx) => {
    const progress = await tx.activityProgress.upsert({
      where: {
        activityId_studentId: {
          activityId,
          studentId
        }
      },
      update: {
        status: ProgressStatus.COMPLETED,
        progressPercent: 100,
        completedAt: new Date()
      },
      create: {
        activityId,
        studentId,
        status: ProgressStatus.COMPLETED,
        progressPercent: 100,
        startedAt: new Date(),
        completedAt: new Date()
      }
    });

    await processActivityCompletionRewards(tx, activityId, studentId);

    return progress;
  });
}

export async function processActivityCompletionRewards(
  tx: Tx,
  activityId: string,
  studentId: string
) {
  await awardBadgeByName(tx, studentId, "First Step");

  const questLinks = await tx.questActivity.findMany({
    where: {
      activityId,
      quest: { isPublished: true }
    }
  });

  for (const link of questLinks) {
    const isComplete = await isQuestCompleteForStudent(tx, link.questId, studentId);
    if (isComplete) {
      await awardQuestXp({ tx, questId: link.questId, studentId });
    }
  }
}

export async function startActivity(activityId: string, studentId: string) {
  await assertStudentCanAccessActivity(activityId, studentId);

  return db.activityProgress.upsert({
    where: {
      activityId_studentId: {
        activityId,
        studentId
      }
    },
    update: {
      status: ProgressStatus.IN_PROGRESS,
      startedAt: new Date()
    },
    create: {
      activityId,
      studentId,
      status: ProgressStatus.IN_PROGRESS,
      progressPercent: 1,
      startedAt: new Date()
    }
  });
}
