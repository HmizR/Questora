import { ActivityType, ProgressStatus } from "@prisma/client";

import { classifyDeadline, isActivityFinishedForDeadline, type DeadlineState } from "@/lib/deadlines";
import { db } from "@/lib/db";

export type StudentDeadlineItem = {
  activityId: string;
  classId: string;
  className: string;
  moduleTitle: string;
  title: string;
  type: ActivityType;
  dueAt: Date;
  state: DeadlineState;
  href: string;
};

export type LecturerDeadlineItem = {
  activityId: string;
  classId: string;
  className: string;
  moduleTitle: string;
  title: string;
  type: ActivityType;
  dueAt: Date;
  state: DeadlineState;
  href: string;
};

export type LecturerOverdueWorkItem = LecturerDeadlineItem & {
  studentId: string;
  studentName: string;
  studentEmail: string;
  reason: "missing-submission" | "quiz-not-passed";
};

function prerequisitesSatisfied(activity: {
  prerequisites: Array<{
    minimumScore: unknown;
    requiredActivity: {
      progresses: Array<{
        status: ProgressStatus;
        bestScore: unknown;
      }>;
    };
  }>;
}) {
  return activity.prerequisites.every((prerequisite) => {
    const progress = prerequisite.requiredActivity.progresses[0];
    const completed = progress?.status === ProgressStatus.COMPLETED;
    const scoreMet =
      !prerequisite.minimumScore ||
      (progress?.bestScore &&
        Number(progress.bestScore) >= Number(prerequisite.minimumScore));

    return completed && scoreMet;
  });
}

export async function getStudentDeadlineItems(input: {
  studentId: string;
  classId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const activities = await db.activity.findMany({
    where: {
      dueAt: { not: null },
      isPublished: true,
      module: {
        isPublished: true,
        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
        class: {
          ...(input.classId ? { id: input.classId } : {}),
          students: {
            some: {
              studentId: input.studentId,
              status: "ACTIVE"
            }
          }
        }
      }
    },
    include: {
      module: { include: { class: true } },
      progresses: { where: { studentId: input.studentId } },
      submissions: { where: { studentId: input.studentId } },
      quizAttempts: { where: { studentId: input.studentId } },
      prerequisites: {
        include: {
          requiredActivity: {
            include: {
              progresses: { where: { studentId: input.studentId } }
            }
          }
        }
      }
    },
    orderBy: { dueAt: "asc" }
  });

  return activities
    .filter(prerequisitesSatisfied)
    .filter((activity) => {
      const progress = activity.progresses[0];
      return !isActivityFinishedForDeadline({
        type: activity.type,
        progressStatus: progress?.status,
        hasSubmission: activity.submissions.length > 0,
        hasPassedQuiz: activity.quizAttempts.some((attempt) => attempt.passed)
      });
    })
    .map((activity): StudentDeadlineItem => ({
      activityId: activity.id,
      classId: activity.module.classId,
      className: activity.module.class.name,
      moduleTitle: activity.module.title,
      title: activity.title,
      type: activity.type,
      dueAt: activity.dueAt as Date,
      state: classifyDeadline(activity.dueAt, now),
      href: `/student/classes/${activity.module.classId}/activities/${activity.id}`
    }));
}

export async function getLecturerDeadlineItems(input: {
  lecturerId: string;
  classId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const activities = await db.activity.findMany({
    where: {
      dueAt: { not: null },
      isPublished: true,
      module: {
        isPublished: true,
        class: {
          lecturerId: input.lecturerId,
          ...(input.classId ? { id: input.classId } : {})
        }
      }
    },
    include: {
      module: { include: { class: true } }
    },
    orderBy: { dueAt: "asc" }
  });

  return activities.map((activity): LecturerDeadlineItem => ({
    activityId: activity.id,
    classId: activity.module.classId,
    className: activity.module.class.name,
    moduleTitle: activity.module.title,
    title: activity.title,
    type: activity.type,
    dueAt: activity.dueAt as Date,
    state: classifyDeadline(activity.dueAt, now),
    href:
      activity.type === ActivityType.QUIZ
        ? `/lecturer/classes/${activity.module.classId}/modules/${activity.moduleId}/activities/${activity.id}/quiz`
        : `/lecturer/classes/${activity.module.classId}/modules`
  }));
}

export async function getLecturerOverdueWork(input: {
  lecturerId: string;
  classId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const activities = await db.activity.findMany({
    where: {
      dueAt: { not: null, lt: now },
      isPublished: true,
      type: { in: [ActivityType.ASSIGNMENT, ActivityType.PROJECT, ActivityType.QUIZ] },
      module: {
        isPublished: true,
        class: {
          lecturerId: input.lecturerId,
          ...(input.classId ? { id: input.classId } : {})
        }
      }
    },
    include: {
      module: {
        include: {
          class: {
            include: {
              students: {
                where: { status: "ACTIVE" },
                include: { student: true }
              }
            }
          }
        }
      },
      submissions: true,
      quizAttempts: true
    },
    orderBy: { dueAt: "asc" }
  });

  return activities.flatMap((activity) =>
    activity.module.class.students.flatMap((enrollment): LecturerOverdueWorkItem[] => {
      const base = {
        activityId: activity.id,
        classId: activity.module.classId,
        className: activity.module.class.name,
        moduleTitle: activity.module.title,
        title: activity.title,
        type: activity.type,
        dueAt: activity.dueAt as Date,
        state: "overdue" as const,
        studentId: enrollment.studentId,
        studentName: enrollment.student.name,
        studentEmail: enrollment.student.email
      };

      if (activity.type === ActivityType.ASSIGNMENT || activity.type === ActivityType.PROJECT) {
        const submitted = activity.submissions.some(
          (submission) => submission.studentId === enrollment.studentId
        );
        return submitted
          ? []
          : [
              {
                ...base,
                reason: "missing-submission",
                href: `/lecturer/classes/${activity.module.classId}/modules/${activity.moduleId}/activities/${activity.id}/submissions?studentId=${enrollment.studentId}`
              }
            ];
      }

      const passed = activity.quizAttempts.some(
        (attempt) => attempt.studentId === enrollment.studentId && attempt.passed
      );
      return passed
        ? []
        : [
            {
              ...base,
              reason: "quiz-not-passed",
              href: `/lecturer/classes/${activity.module.classId}/modules/${activity.moduleId}/activities/${activity.id}/quiz`
            }
          ];
    })
  );
}
