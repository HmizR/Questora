import { ActivityType, NotificationType, ProgressStatus, SubmissionStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createNotification } from "@/services/notification-service";
import { processActivityCompletionRewards } from "@/services/progress-service";

type RubricScoreInput = {
  criterionId: string;
  score: number;
  feedback?: string;
};

function prismaErrorToAppError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new AppError("CONFLICT", "That position is already used.");
  }

  return error;
}

async function getRubricActivityForLecturer(activityId: string, lecturerId: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    include: {
      module: { include: { class: true } },
      rubric: {
        include: {
          criteria: { orderBy: { position: "asc" } },
          assessments: { select: { id: true }, take: 1 }
        }
      }
    }
  });

  if (!activity) {
    throw new AppError("NOT_FOUND", "Mission not found.");
  }

  if (activity.module.class.lecturerId !== lecturerId) {
    throw new AppError("FORBIDDEN", "You can only manage rubrics in your own realms.");
  }

  if (activity.type !== ActivityType.ASSIGNMENT && activity.type !== ActivityType.PROJECT) {
    throw new AppError("BAD_REQUEST", "Rubrics are only available for assignments and boss battles.");
  }

  return activity;
}

export async function createRubricCriterion(input: {
  lecturerId: string;
  activityId: string;
  title: string;
  description?: string;
  maxPoints: number;
  position: number;
}) {
  await getRubricActivityForLecturer(input.activityId, input.lecturerId);

  try {
    return await db.$transaction(async (tx) => {
      const rubric = await tx.rubric.upsert({
        where: { activityId: input.activityId },
        update: {},
        create: { activityId: input.activityId }
      });

      return tx.rubricCriterion.create({
        data: {
          rubricId: rubric.id,
          title: input.title,
          description: input.description,
          maxPoints: input.maxPoints,
          position: input.position
        }
      });
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function updateRubricCriterion(input: {
  lecturerId: string;
  activityId: string;
  criterionId: string;
  title: string;
  description?: string;
  maxPoints: number;
  position: number;
}) {
  const activity = await getRubricActivityForLecturer(input.activityId, input.lecturerId);
  const criterion = activity.rubric?.criteria.find((entry) => entry.id === input.criterionId);

  if (!criterion) {
    throw new AppError("NOT_FOUND", "Rubric criterion not found.");
  }

  const hasAssessments = Boolean(activity.rubric?.assessments.length);
  const scoringShapeChanged =
    Number(criterion.maxPoints) !== input.maxPoints || criterion.position !== input.position;

  if (hasAssessments && scoringShapeChanged) {
    throw new AppError(
      "BAD_REQUEST",
      "Rubric grading has already started. You can only update criterion text."
    );
  }

  try {
    return await db.rubricCriterion.update({
      where: { id: input.criterionId },
      data: {
        title: input.title,
        description: input.description,
        maxPoints: input.maxPoints,
        position: input.position
      }
    });
  } catch (error) {
    throw prismaErrorToAppError(error);
  }
}

export async function deleteRubricCriterion(input: {
  lecturerId: string;
  activityId: string;
  criterionId: string;
}) {
  const activity = await getRubricActivityForLecturer(input.activityId, input.lecturerId);
  const criterion = activity.rubric?.criteria.find((entry) => entry.id === input.criterionId);

  if (!criterion) {
    throw new AppError("NOT_FOUND", "Rubric criterion not found.");
  }

  if (activity.rubric?.assessments.length) {
    throw new AppError("BAD_REQUEST", "Criteria cannot be deleted after rubric grading starts.");
  }

  return db.rubricCriterion.delete({ where: { id: input.criterionId } });
}

export async function gradeSubmissionWithRubric(input: {
  lecturerId: string;
  submissionId: string;
  overallFeedback?: string;
  scores: RubricScoreInput[];
}) {
  const submission = await db.submission.findUnique({
    where: { id: input.submissionId },
    include: {
      activity: {
        include: {
          module: {
            include: { class: true }
          },
          rubric: {
            include: {
              criteria: { orderBy: { position: "asc" } }
            }
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

  if (
    submission.activity.type !== ActivityType.ASSIGNMENT &&
    submission.activity.type !== ActivityType.PROJECT
  ) {
    throw new AppError("BAD_REQUEST", "Rubric grading is only available for assignments and boss battles.");
  }

  if (submission.status === SubmissionStatus.RETURNED) {
    throw new AppError("BAD_REQUEST", "Returned submissions must be resubmitted before grading.");
  }

  const rubric = submission.activity.rubric;
  if (!rubric || rubric.criteria.length === 0) {
    throw new AppError("BAD_REQUEST", "Add rubric criteria before grading with a rubric.");
  }

  const scoreMap = new Map(input.scores.map((score) => [score.criterionId, score]));
  const unknownScores = input.scores.filter(
    (score) => !rubric.criteria.some((criterion) => criterion.id === score.criterionId)
  );

  if (unknownScores.length > 0 || scoreMap.size !== rubric.criteria.length) {
    throw new AppError("VALIDATION_ERROR", "Enter one score for each rubric criterion.");
  }

  let totalScore = 0;
  const normalizedScores = rubric.criteria.map((criterion) => {
    const scoreInput = scoreMap.get(criterion.id);
    if (!scoreInput || !Number.isFinite(scoreInput.score)) {
      throw new AppError("VALIDATION_ERROR", "Enter one valid score for each rubric criterion.");
    }

    const maxPoints = Number(criterion.maxPoints);
    if (scoreInput.score < 0 || scoreInput.score > maxPoints) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Score for ${criterion.title} must be between 0 and ${criterion.maxPoints.toString()}.`
      );
    }

    totalScore += scoreInput.score;
    return {
      criterionId: criterion.id,
      score: scoreInput.score,
      feedback: scoreInput.feedback
    };
  });

  return db.$transaction(async (tx) => {
    const grade = await tx.grade.upsert({
      where: {
        activityId_studentId: {
          activityId: submission.activityId,
          studentId: submission.studentId
        }
      },
      update: {
        score: totalScore,
        feedback: input.overallFeedback,
        gradedById: input.lecturerId,
        gradedAt: new Date()
      },
      create: {
        activityId: submission.activityId,
        studentId: submission.studentId,
        score: totalScore,
        feedback: input.overallFeedback,
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
        bestScore: totalScore,
        completedAt: new Date()
      },
      create: {
        activityId: submission.activityId,
        studentId: submission.studentId,
        status: ProgressStatus.COMPLETED,
        progressPercent: 100,
        bestScore: totalScore,
        startedAt: submission.createdAt,
        submittedAt: submission.submittedAt,
        completedAt: new Date()
      }
    });

    const existingAssessment = await tx.rubricAssessment.findUnique({
      where: {
        rubricId_submissionId: {
          rubricId: rubric.id,
          submissionId: submission.id
        }
      }
    });

    const assessment = existingAssessment
      ? await tx.rubricAssessment.update({
          where: { id: existingAssessment.id },
          data: {
            gradeId: grade.id,
            studentId: submission.studentId,
            gradedById: input.lecturerId
          }
        })
      : await tx.rubricAssessment.create({
          data: {
            rubricId: rubric.id,
            submissionId: submission.id,
            gradeId: grade.id,
            studentId: submission.studentId,
            gradedById: input.lecturerId
          }
        });

    await tx.rubricCriterionScore.deleteMany({
      where: { assessmentId: assessment.id }
    });

    await tx.rubricCriterionScore.createMany({
      data: normalizedScores.map((score) => ({
        assessmentId: assessment.id,
        criterionId: score.criterionId,
        score: score.score,
        feedback: score.feedback
      }))
    });

    await processActivityCompletionRewards(tx, submission.activityId, submission.studentId);

    return grade;
  });
}
