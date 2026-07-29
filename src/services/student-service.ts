import {
  ActivityType,
  NotificationType,
  Prisma,
  ProgressStatus,
  SubmissionStatus
} from "@prisma/client";

import { db } from "@/lib/db";
import { canStudentEditSubmission } from "@/lib/domain-rules";
import { AppError } from "@/lib/errors";
import { parseQuizDefinition, quizAnswersSchema, scoreQuiz } from "@/lib/quiz";
import { createNotification } from "@/services/notification-service";
import {
  assertStudentCanAccessActivity,
  processActivityCompletionRewards
} from "@/services/progress-service";

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
    const existingSubmission = await tx.submission.findUnique({
      where: {
        activityId_studentId: {
          activityId: input.activityId,
          studentId: input.studentId
        }
      }
    });

    if (!canStudentEditSubmission(existingSubmission?.status)) {
      throw new AppError("FORBIDDEN", "This submission has already been graded.");
    }

    if (existingSubmission) {
      const revisionCount = await tx.submissionRevision.count({
        where: { submissionId: existingSubmission.id }
      });

      await tx.submissionRevision.create({
        data: {
          submissionId: existingSubmission.id,
          activityId: existingSubmission.activityId,
          studentId: existingSubmission.studentId,
          revisionNo: revisionCount + 1,
          textContent: existingSubmission.textContent,
          fileUrl: existingSubmission.fileUrl,
          status: existingSubmission.status,
          returnFeedback: existingSubmission.returnFeedback,
          returnedAt: existingSubmission.returnedAt,
          submittedAt: existingSubmission.submittedAt
        }
      });
    }

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
        returnFeedback: null,
        returnedAt: null,
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

    await createNotification(
      {
        recipientId: activity.module.class.lecturerId,
        actorId: input.studentId,
        type: NotificationType.SUBMISSION_SUBMITTED,
        title: "Mission submitted",
        body: `${activity.title} has a new submission.`,
        href: `/lecturer/classes/${activity.module.classId}/modules/${activity.moduleId}/activities/${activity.id}/submissions?studentId=${input.studentId}`,
        entityType: "Submission",
        entityId: submission.id
      },
      tx
    );

    return submission;
  });
}

export async function attemptQuiz(input: {
  activityId: string;
  studentId: string;
  [key: string]: unknown;
}) {
  const activity = await assertStudentCanAccessActivity(input.activityId, input.studentId);

  if (activity.type !== ActivityType.QUIZ) {
    throw new AppError("BAD_REQUEST", "Only quizzes can be attempted here.");
  }

  const definition = parseQuizDefinition(activity.content);
  if (!definition) {
    throw new AppError("BAD_REQUEST", "This quiz has no valid questions yet.");
  }

  const rawAnswers = Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => key.startsWith("answer_"))
      .map(([key, value]) => [key.replace("answer_", ""), value])
  );
  const answers = quizAnswersSchema.parse(rawAnswers);
  const scored = scoreQuiz(definition, answers);
  const passingScore = activity.passingScore
    ? Number(activity.passingScore)
    : scored.maxScore;
  const passed = scored.score >= passingScore;

  return db.$transaction(async (tx) => {
    const previousAttemptCount = await tx.quizAttempt.count({
      where: {
        activityId: input.activityId,
        studentId: input.studentId
      }
    });

    if (activity.maxAttempts && previousAttemptCount >= activity.maxAttempts) {
      throw new AppError("FORBIDDEN", "You have used all attempts for this quiz.");
    }

    const attempt = await tx.quizAttempt.create({
      data: {
        activityId: input.activityId,
        studentId: input.studentId,
        attemptNo: previousAttemptCount + 1,
        answers: {
          selected: answers,
          results: scored.results
        } as Prisma.InputJsonValue,
        score: scored.score,
        maxScore: scored.maxScore,
        passed
      }
    });

    const existingProgress = await tx.activityProgress.findUnique({
      where: {
        activityId_studentId: {
          activityId: input.activityId,
          studentId: input.studentId
        }
      }
    });
    const previousBestScore = existingProgress?.bestScore ? Number(existingProgress.bestScore) : 0;
    const bestScore = Math.max(previousBestScore, scored.score);
    const wasCompleted = existingProgress?.status === ProgressStatus.COMPLETED;
    const nextStatus = passed ? ProgressStatus.COMPLETED : ProgressStatus.FAILED;
    const progressPercent =
      scored.maxScore > 0 ? Math.round((bestScore / scored.maxScore) * 100) : 0;

    await tx.activityProgress.upsert({
      where: {
        activityId_studentId: {
          activityId: input.activityId,
          studentId: input.studentId
        }
      },
      update: {
        status: wasCompleted ? ProgressStatus.COMPLETED : nextStatus,
        progressPercent: passed ? 100 : progressPercent,
        bestScore,
        submittedAt: new Date(),
        completedAt: passed ? new Date() : existingProgress?.completedAt
      },
      create: {
        activityId: input.activityId,
        studentId: input.studentId,
        status: nextStatus,
        progressPercent: passed ? 100 : progressPercent,
        bestScore,
        startedAt: new Date(),
        submittedAt: new Date(),
        completedAt: passed ? new Date() : undefined
      }
    });

    if (passed && !wasCompleted) {
      await processActivityCompletionRewards(tx, input.activityId, input.studentId);
    }

    const existingGrade = await tx.grade.findUnique({
      where: {
        activityId_studentId: {
          activityId: input.activityId,
          studentId: input.studentId
        }
      }
    });
    const shouldUpdateGrade = !existingGrade || Number(existingGrade.score) < bestScore;

    if (shouldUpdateGrade) {
      await tx.grade.upsert({
        where: {
          activityId_studentId: {
            activityId: input.activityId,
            studentId: input.studentId
          }
        },
        update: {
          score: bestScore,
          feedback: `Best quiz attempt score: ${bestScore}/${scored.maxScore}`,
          gradedById: activity.module.class.lecturerId,
          gradedAt: new Date(),
          publishedAt: new Date()
        },
        create: {
          activityId: input.activityId,
          studentId: input.studentId,
          score: bestScore,
          feedback: `Best quiz attempt score: ${bestScore}/${scored.maxScore}`,
          gradedById: activity.module.class.lecturerId,
          publishedAt: new Date()
        }
      });
    }

    return attempt;
  });
}
