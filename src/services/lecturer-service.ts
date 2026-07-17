import { ProgressStatus, SubmissionStatus, type ActivityType, type QuestType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { processActivityCompletionRewards } from "@/services/progress-service";

async function getModuleForLecturer(moduleId: string, lecturerId: string) {
  const learningModule = await db.module.findUnique({
    where: { id: moduleId },
    include: { class: true }
  });

  if (!learningModule) {
    throw new AppError("NOT_FOUND", "Module not found.");
  }

  if (learningModule.class.lecturerId !== lecturerId) {
    throw new AppError("FORBIDDEN", "You can only manage regions in your own realms.");
  }

  return learningModule;
}

async function getActivityForLecturer(activityId: string, lecturerId: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    include: { module: { include: { class: true } } }
  });

  if (!activity) {
    throw new AppError("NOT_FOUND", "Activity not found.");
  }

  if (activity.module.class.lecturerId !== lecturerId) {
    throw new AppError("FORBIDDEN", "You can only manage missions in your own realms.");
  }

  return activity;
}

async function getQuestForLecturer(questId: string, lecturerId: string) {
  const quest = await db.quest.findUnique({
    where: { id: questId },
    include: { class: true }
  });

  if (!quest) {
    throw new AppError("NOT_FOUND", "Quest not found.");
  }

  if (quest.class.lecturerId !== lecturerId) {
    throw new AppError("FORBIDDEN", "You can only manage quests in your own realms.");
  }

  return quest;
}

function prismaErrorToAppError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new AppError("CONFLICT", "That position is already used.");
  }

  return error;
}

export async function createModule(input: {
  lecturerId: string;
  classId: string;
  title: string;
  description?: string;
  position: number;
  isPublished: boolean;
  availableFrom?: Date;
}) {
  const teachingClass = await db.class.findUnique({ where: { id: input.classId } });
  if (!teachingClass) {
    throw new AppError("NOT_FOUND", "Class not found.");
  }

  if (teachingClass.lecturerId !== input.lecturerId) {
    throw new AppError("FORBIDDEN", "You can only create regions in your own realms.");
  }

  try {
    return await db.module.create({
      data: {
        classId: input.classId,
        title: input.title,
        description: input.description,
        position: input.position,
        isPublished: input.isPublished,
        availableFrom: input.availableFrom
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function updateModule(input: {
  lecturerId: string;
  moduleId: string;
  title: string;
  description?: string;
  position: number;
  isPublished: boolean;
  availableFrom?: Date;
}) {
  await getModuleForLecturer(input.moduleId, input.lecturerId);

  try {
    return await db.module.update({
      where: { id: input.moduleId },
      data: {
        title: input.title,
        description: input.description,
        position: input.position,
        isPublished: input.isPublished,
        availableFrom: input.availableFrom
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function publishModule(moduleId: string, lecturerId: string) {
  await getModuleForLecturer(moduleId, lecturerId);
  return db.module.update({ where: { id: moduleId }, data: { isPublished: true } });
}

export async function deleteModule(moduleId: string, lecturerId: string) {
  await getModuleForLecturer(moduleId, lecturerId);
  return db.module.delete({ where: { id: moduleId } });
}

export async function createActivity(input: {
  lecturerId: string;
  moduleId: string;
  type: ActivityType;
  title: string;
  description?: string;
  content?: string;
  position: number;
  maxScore?: number;
  passingScore?: number;
  maxAttempts?: number;
  dueAt?: Date;
  isRequired: boolean;
  isPublished: boolean;
}) {
  await getModuleForLecturer(input.moduleId, input.lecturerId);

  try {
    return await db.activity.create({
      data: {
        moduleId: input.moduleId,
        type: input.type,
        title: input.title,
        description: input.description,
        content: input.content,
        position: input.position,
        maxScore: input.maxScore,
        passingScore: input.passingScore,
        maxAttempts: input.maxAttempts,
        dueAt: input.dueAt,
        isRequired: input.isRequired,
        isPublished: input.isPublished
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function updateActivity(input: {
  lecturerId: string;
  activityId: string;
  moduleId: string;
  type: ActivityType;
  title: string;
  description?: string;
  content?: string;
  position: number;
  maxScore?: number;
  passingScore?: number;
  maxAttempts?: number;
  dueAt?: Date;
  isRequired: boolean;
  isPublished: boolean;
}) {
  await getActivityForLecturer(input.activityId, input.lecturerId);
  await getModuleForLecturer(input.moduleId, input.lecturerId);

  try {
    return await db.activity.update({
      where: { id: input.activityId },
      data: {
        moduleId: input.moduleId,
        type: input.type,
        title: input.title,
        description: input.description,
        content: input.content,
        position: input.position,
        maxScore: input.maxScore,
        passingScore: input.passingScore,
        maxAttempts: input.maxAttempts,
        dueAt: input.dueAt,
        isRequired: input.isRequired,
        isPublished: input.isPublished
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function publishActivity(activityId: string, lecturerId: string) {
  await getActivityForLecturer(activityId, lecturerId);
  return db.activity.update({ where: { id: activityId }, data: { isPublished: true } });
}

export async function deleteActivity(activityId: string, lecturerId: string) {
  await getActivityForLecturer(activityId, lecturerId);
  return db.activity.delete({ where: { id: activityId } });
}

export async function createActivityResource(input: {
  lecturerId: string;
  activityId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  contentType: string;
  size: number;
  position: number;
}) {
  await getActivityForLecturer(input.activityId, input.lecturerId);

  try {
    return await db.activityResource.create({
      data: {
        activityId: input.activityId,
        title: input.title,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        contentType: input.contentType,
        size: input.size,
        position: input.position,
        createdById: input.lecturerId
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function deleteActivityResource(input: {
  lecturerId: string;
  activityId: string;
  resourceId: string;
}) {
  await getActivityForLecturer(input.activityId, input.lecturerId);

  const resource = await db.activityResource.findUnique({
    where: { id: input.resourceId }
  });

  if (!resource || resource.activityId !== input.activityId) {
    throw new AppError("NOT_FOUND", "Resource not found.");
  }

  return db.activityResource.delete({ where: { id: input.resourceId } });
}

export async function addActivityPrerequisite(input: {
  lecturerId: string;
  activityId: string;
  requiredActivityId: string;
  minimumScore?: number;
}) {
  if (input.activityId === input.requiredActivityId) {
    throw new AppError("BAD_REQUEST", "A mission cannot require itself.");
  }

  const [activity, requiredActivity] = await Promise.all([
    getActivityForLecturer(input.activityId, input.lecturerId),
    getActivityForLecturer(input.requiredActivityId, input.lecturerId)
  ]);

  if (activity.module.classId !== requiredActivity.module.classId) {
    throw new AppError("BAD_REQUEST", "Prerequisites must be in the same learning realm.");
  }

  const directCycle = await db.activityPrerequisite.findUnique({
    where: {
      activityId_requiredActivityId: {
        activityId: input.requiredActivityId,
        requiredActivityId: input.activityId
      }
    }
  });

  if (directCycle) {
    throw new AppError("BAD_REQUEST", "This would create a direct prerequisite loop.");
  }

  return db.activityPrerequisite.upsert({
    where: {
      activityId_requiredActivityId: {
        activityId: input.activityId,
        requiredActivityId: input.requiredActivityId
      }
    },
    update: {
      minimumScore: input.minimumScore
    },
    create: {
      activityId: input.activityId,
      requiredActivityId: input.requiredActivityId,
      minimumScore: input.minimumScore
    }
  });
}

export async function removeActivityPrerequisite(input: {
  lecturerId: string;
  activityId: string;
  requiredActivityId: string;
}) {
  await getActivityForLecturer(input.activityId, input.lecturerId);

  return db.activityPrerequisite.delete({
    where: {
      activityId_requiredActivityId: {
        activityId: input.activityId,
        requiredActivityId: input.requiredActivityId
      }
    }
  });
}

export async function createQuest(input: {
  lecturerId: string;
  classId: string;
  title: string;
  description?: string;
  type: QuestType;
  position: number;
  xpReward: number;
  isOptional: boolean;
  isPublished: boolean;
}) {
  const teachingClass = await db.class.findUnique({ where: { id: input.classId } });
  if (!teachingClass) {
    throw new AppError("NOT_FOUND", "Class not found.");
  }

  if (teachingClass.lecturerId !== input.lecturerId) {
    throw new AppError("FORBIDDEN", "You can only create quests in your own realms.");
  }

  try {
    return await db.quest.create({
      data: {
        classId: input.classId,
        title: input.title,
        description: input.description,
        type: input.type,
        position: input.position,
        xpReward: input.xpReward,
        isOptional: input.isOptional,
        isPublished: input.isPublished
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function updateQuest(input: {
  lecturerId: string;
  questId: string;
  classId: string;
  title: string;
  description?: string;
  type: QuestType;
  position: number;
  xpReward: number;
  isOptional: boolean;
  isPublished: boolean;
}) {
  const quest = await getQuestForLecturer(input.questId, input.lecturerId);
  if (quest.classId !== input.classId) {
    throw new AppError("BAD_REQUEST", "A quest cannot be moved to another class.");
  }

  try {
    return await db.quest.update({
      where: { id: input.questId },
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        position: input.position,
        xpReward: input.xpReward,
        isOptional: input.isOptional,
        isPublished: input.isPublished
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function publishQuest(questId: string, lecturerId: string) {
  await getQuestForLecturer(questId, lecturerId);
  return db.quest.update({ where: { id: questId }, data: { isPublished: true } });
}

export async function deleteQuest(questId: string, lecturerId: string) {
  await getQuestForLecturer(questId, lecturerId);
  return db.quest.delete({ where: { id: questId } });
}

export async function connectActivityToQuest(input: {
  lecturerId: string;
  classId: string;
  questId: string;
  activityId: string;
  position: number;
}) {
  const [quest, activity] = await Promise.all([
    getQuestForLecturer(input.questId, input.lecturerId),
    getActivityForLecturer(input.activityId, input.lecturerId)
  ]);

  if (quest.classId !== input.classId || activity.module.classId !== input.classId) {
    throw new AppError("BAD_REQUEST", "Quest and mission must belong to the same realm.");
  }

  try {
    return await db.questActivity.upsert({
      where: {
        questId_activityId: {
          questId: input.questId,
          activityId: input.activityId
        }
      },
      update: { position: input.position },
      create: {
        questId: input.questId,
        activityId: input.activityId,
        position: input.position
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function removeActivityFromQuest(input: {
  lecturerId: string;
  classId: string;
  questId: string;
  activityId: string;
}) {
  const [quest, activity] = await Promise.all([
    getQuestForLecturer(input.questId, input.lecturerId),
    getActivityForLecturer(input.activityId, input.lecturerId)
  ]);

  if (quest.classId !== input.classId || activity.module.classId !== input.classId) {
    throw new AppError("BAD_REQUEST", "Quest and mission must belong to the same realm.");
  }

  return db.questActivity.delete({
    where: {
      questId_activityId: {
        questId: input.questId,
        activityId: input.activityId
      }
    }
  });
}

export async function gradeSubmission(input: {
  lecturerId: string;
  submissionId: string;
  score: number;
  feedback?: string;
}) {
  const submission = await db.submission.findUnique({
    where: { id: input.submissionId },
    include: {
      activity: {
        include: {
          module: {
            include: { class: true }
          }
        }
      }
    }
  });

  if (!submission) {
    throw new AppError("NOT_FOUND", "Submission not found.");
  }

  if (submission.activity.module.class.lecturerId !== input.lecturerId) {
    throw new AppError("FORBIDDEN", "You can only grade submissions in your own realms.");
  }

  return db.$transaction(async (tx) => {
    const grade = await tx.grade.upsert({
      where: {
        activityId_studentId: {
          activityId: submission.activityId,
          studentId: submission.studentId
        }
      },
      update: {
        score: input.score,
        feedback: input.feedback,
        gradedById: input.lecturerId,
        gradedAt: new Date()
      },
      create: {
        activityId: submission.activityId,
        studentId: submission.studentId,
        score: input.score,
        feedback: input.feedback,
        gradedById: input.lecturerId
      }
    });

    await tx.submission.update({
      where: { id: submission.id },
      data: { status: SubmissionStatus.GRADED }
    });

    await tx.activityProgress.upsert({
      where: {
        activityId_studentId: {
          activityId: submission.activityId,
          studentId: submission.studentId
        }
      },
      update: {
        status: ProgressStatus.COMPLETED,
        progressPercent: 100,
        bestScore: input.score,
        completedAt: new Date()
      },
      create: {
        activityId: submission.activityId,
        studentId: submission.studentId,
        status: ProgressStatus.COMPLETED,
        progressPercent: 100,
        bestScore: input.score,
        startedAt: submission.createdAt,
        submittedAt: submission.submittedAt,
        completedAt: new Date()
      }
    });

    await processActivityCompletionRewards(tx, submission.activityId, submission.studentId);

    return grade;
  });
}
