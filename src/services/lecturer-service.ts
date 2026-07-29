import {
  ActivityResourceKind,
  ActivityType,
  NotificationType,
  ProgressStatus,
  SubmissionStatus,
  type QuestType
} from "@prisma/client";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  createNotification,
  createNotifications,
  getActiveClassStudentIds
} from "@/services/notification-service";
import { processActivityCompletionRewards } from "@/services/progress-service";
import { extractTextFromResource } from "@/services/resource-text-service";

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
  const activity = await getActivityForLecturer(activityId, lecturerId);
  const wasPublished = activity.isPublished;

  return db.$transaction(async (tx) => {
    const published = await tx.activity.update({
      where: { id: activityId },
      data: { isPublished: true }
    });

    if (!wasPublished && activity.module.isPublished) {
      const studentIds = await getActiveClassStudentIds(activity.module.classId, tx);
      await createNotifications(
        studentIds.map((studentId) => ({
          recipientId: studentId,
          actorId: lecturerId,
          type: NotificationType.MISSION_PUBLISHED,
          title: "New mission available",
          body: activity.title,
          href: `/student/classes/${activity.module.classId}/activities/${activity.id}`,
          entityType: "Activity",
          entityId: activity.id,
          dedupeKey: `activity:${activity.id}:published:student:${studentId}`
        })),
        tx
      );
    }

    return published;
  });
}

export async function deleteActivity(activityId: string, lecturerId: string) {
  await getActivityForLecturer(activityId, lecturerId);
  return db.activity.delete({ where: { id: activityId } });
}

export async function createActivityResource(input: {
  lecturerId: string;
  activityId: string;
  title: string;
  description?: string;
  kind?: ActivityResourceKind;
  isRequired?: boolean;
  fileName: string;
  fileUrl: string;
  contentType: string;
  size: number;
  position: number;
}) {
  await getActivityForLecturer(input.activityId, input.lecturerId);

  try {
    const resource = await db.activityResource.create({
      data: {
        activityId: input.activityId,
        title: input.title,
        description: input.description,
        kind: input.kind ?? ActivityResourceKind.OTHER,
        isRequired: input.isRequired ?? false,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        contentType: input.contentType,
        size: input.size,
        position: input.position,
        createdById: input.lecturerId
      }
    });
    await extractTextFromResource(resource);
    const activity = await db.activity.findUnique({
      where: { id: input.activityId },
      include: { module: true }
    });

    if (activity?.isPublished && activity.module.isPublished) {
      const studentIds = await getActiveClassStudentIds(activity.module.classId);
      await createNotifications(
        studentIds.map((studentId) => ({
          recipientId: studentId,
          actorId: input.lecturerId,
          type: NotificationType.RESOURCE_ADDED,
          title: "New mission resource",
          body: `${resource.title} was added to ${activity.title}.`,
          href: `/student/classes/${activity.module.classId}/activities/${activity.id}`,
          entityType: "ActivityResource",
          entityId: resource.id,
          dedupeKey: `resource:${resource.id}:added:student:${studentId}`
        }))
      );
    }
    return resource;
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function updateActivityResource(input: {
  lecturerId: string;
  activityId: string;
  resourceId: string;
  title: string;
  description?: string;
  kind: ActivityResourceKind;
  isRequired: boolean;
  position: number;
}) {
  await getActivityForLecturer(input.activityId, input.lecturerId);

  const resource = await db.activityResource.findUnique({
    where: { id: input.resourceId }
  });

  if (!resource || resource.activityId !== input.activityId) {
    throw new AppError("NOT_FOUND", "Resource not found.");
  }

  try {
    return await db.activityResource.update({
      where: { id: input.resourceId },
      data: {
        title: input.title,
        description: input.description,
        kind: input.kind,
        isRequired: input.isRequired,
        position: input.position
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

  if (submission.status === SubmissionStatus.RETURNED) {
    throw new AppError("BAD_REQUEST", "Returned submissions must be resubmitted before grading.");
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

    await createNotification(
      {
        recipientId: submission.studentId,
        actorId: input.lecturerId,
        type: NotificationType.GRADE_DRAFTED,
        title: "Grade draft saved",
        body: `A draft grade was saved for ${submission.activity.title}.`,
        href: `/student/classes/${submission.activity.module.classId}/grades`,
        entityType: "Grade",
        entityId: grade.id,
        dedupeKey: `grade:${grade.id}:drafted:student:${submission.studentId}`
      },
      tx
    );

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

export async function returnSubmissionForRevision(input: {
  lecturerId: string;
  submissionId: string;
  returnFeedback: string;
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
    throw new AppError("FORBIDDEN", "You can only return submissions in your own realms.");
  }

  if (
    submission.activity.type !== ActivityType.ASSIGNMENT &&
    submission.activity.type !== ActivityType.PROJECT
  ) {
    throw new AppError("BAD_REQUEST", "Only assignments and boss battles can be returned.");
  }

  if (submission.status === SubmissionStatus.GRADED) {
    throw new AppError("FORBIDDEN", "This submission has already been graded.");
  }

  const feedback = input.returnFeedback.trim();
  if (!feedback) {
    throw new AppError("VALIDATION_ERROR", "Revision feedback is required.");
  }

  return db.$transaction(async (tx) => {
    const returned = await tx.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.RETURNED,
        returnFeedback: feedback,
        returnedAt: new Date()
      }
    });

    await createNotification(
      {
        recipientId: submission.studentId,
        actorId: input.lecturerId,
        type: NotificationType.SUBMISSION_RETURNED,
        title: "Submission returned",
        body: `${submission.activity.title} was returned for revision.`,
        href: `/student/classes/${submission.activity.module.classId}/activities/${submission.activityId}`,
        entityType: "Submission",
        entityId: submission.id
      },
      tx
    );

    await tx.activityProgress.upsert({
      where: {
        activityId_studentId: {
          activityId: submission.activityId,
          studentId: submission.studentId
        }
      },
      update: {
        status: ProgressStatus.IN_PROGRESS,
        progressPercent: 75,
        completedAt: null
      },
      create: {
        activityId: submission.activityId,
        studentId: submission.studentId,
        status: ProgressStatus.IN_PROGRESS,
        progressPercent: 75,
        startedAt: submission.createdAt,
        submittedAt: submission.submittedAt
      }
    });

    return returned;
  });
}
