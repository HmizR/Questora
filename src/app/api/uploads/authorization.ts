import { ActivityType, UserRole } from "@prisma/client";

import { requireUser } from "@/lib/authorization-service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { UploadIntent } from "@/lib/storage";

async function requireSubmissionActivity(activityId: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    include: { module: true }
  });

  if (
    !activity ||
    (activity.type !== ActivityType.ASSIGNMENT && activity.type !== ActivityType.PROJECT)
  ) {
    throw new AppError("FORBIDDEN", "Submission uploads are only available for assignments and projects.");
  }

  return activity;
}

async function requireActivity(activityId: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    include: { module: true }
  });

  if (!activity) {
    throw new AppError("NOT_FOUND", "Activity not found.");
  }

  return activity;
}

export async function authorizeUploadIntent(input: {
  intent: UploadIntent;
  activityId?: string;
}) {
  const user = await requireUser();

  if (input.intent === "AVATAR") {
    return { user, keyUserId: user.id };
  }

  if (!input.activityId) {
    throw new AppError("VALIDATION_ERROR", "Activity is required for this upload.");
  }

  if (input.intent === "SUBMISSION") {
    if (user.role !== UserRole.STUDENT) {
      throw new AppError("FORBIDDEN", "Only students can upload submissions.");
    }

    const activity = await requireSubmissionActivity(input.activityId);
    const enrollment = await db.classStudent.findFirst({
      where: {
        classId: activity.module.classId,
        studentId: user.id,
        status: "ACTIVE"
      }
    });

    if (!enrollment) {
      throw new AppError("FORBIDDEN", "You are not enrolled in this class.");
    }

    return { user, activity, keyUserId: user.id };
  }

  if (user.role !== UserRole.LECTURER) {
    throw new AppError("FORBIDDEN", "Only lecturers can upload mission resources.");
  }

  const activity = await requireActivity(input.activityId);
  const teachingClass = await db.class.findFirst({
    where: {
      id: activity.module.classId,
      lecturerId: user.id
    }
  });

  if (!teachingClass) {
    throw new AppError("FORBIDDEN", "You can only manage classes assigned to you.");
  }

  return { user, activity, keyUserId: user.id };
}

export async function authorizeStorageRef(input: {
  intent: UploadIntent;
  key: string;
  activityId?: string;
}) {
  const authorization = await authorizeUploadIntent({
    intent: input.intent,
    activityId: input.activityId
  });

  if (input.intent === "AVATAR" && !input.key.startsWith(`avatars/${authorization.user.id}/`)) {
    throw new AppError("FORBIDDEN", "You do not have access to this file.");
  }

  if (
    input.intent === "SUBMISSION" &&
    (!input.activityId ||
      !input.key.startsWith(`submissions/${input.activityId}/${authorization.user.id}/`))
  ) {
    throw new AppError("FORBIDDEN", "You do not have access to this file.");
  }

  if (
    input.intent === "MISSION_RESOURCE" &&
    (!input.activityId || !input.key.startsWith(`mission-resources/${input.activityId}/`))
  ) {
    throw new AppError("FORBIDDEN", "You do not have access to this file.");
  }

  return authorization;
}
