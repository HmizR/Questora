import { ActivityType, ProgressStatus, SubmissionStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertStudentCanAccessActivity, completeActivity } from "@/services/progress-service";

export async function submitAssignment(input: {
  activityId: string;
  studentId: string;
  textContent?: string;
  fileUrl?: string;
}) {
  const activity = await assertStudentCanAccessActivity(input.activityId, input.studentId);

  if (activity.type !== ActivityType.ASSIGNMENT && activity.type !== ActivityType.PROJECT) {
    throw new AppError("BAD_REQUEST", "Only assignments and boss battles accept submissions.");
  }

  if (!input.textContent && !input.fileUrl) {
    throw new AppError("VALIDATION_ERROR", "Add text feedback or a file URL before submitting.");
  }

  return db.$transaction(async (tx) => {
    const submission = await tx.submission.upsert({
      where: {
        activityId_studentId: {
          activityId: input.activityId,
          studentId: input.studentId
        }
      },
      update: {
        textContent: input.textContent,
        fileUrl: input.fileUrl,
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date()
      },
      create: {
        activityId: input.activityId,
        studentId: input.studentId,
        textContent: input.textContent,
        fileUrl: input.fileUrl,
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date()
      }
    });

    await tx.activityProgress.upsert({
      where: {
        activityId_studentId: {
          activityId: input.activityId,
          studentId: input.studentId
        }
      },
      update: {
        status: ProgressStatus.SUBMITTED,
        progressPercent: 90,
        submittedAt: new Date()
      },
      create: {
        activityId: input.activityId,
        studentId: input.studentId,
        status: ProgressStatus.SUBMITTED,
        progressPercent: 90,
        startedAt: new Date(),
        submittedAt: new Date()
      }
    });

    return submission;
  });
}

export async function attemptQuiz(input: {
  activityId: string;
  studentId: string;
  response?: string;
}) {
  const activity = await assertStudentCanAccessActivity(input.activityId, input.studentId);

  if (activity.type !== ActivityType.QUIZ) {
    throw new AppError("BAD_REQUEST", "Only quizzes can be attempted here.");
  }

  return completeActivity(input.activityId, input.studentId);
}
