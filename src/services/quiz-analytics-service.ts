import { ActivityType } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { calculateQuizAnalytics } from "@/lib/quiz-analytics";
import { parseQuizDefinition } from "@/lib/quiz";

export async function getLecturerQuizAnalytics(input: {
  lecturerId: string;
  classId: string;
  moduleId: string;
  activityId: string;
}) {
  const teachingClass = await db.class.findFirst({
    where: {
      id: input.classId,
      lecturerId: input.lecturerId
    },
    include: {
      students: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            include: {
              quizAttempts: {
                where: { activityId: input.activityId },
                orderBy: { attemptNo: "desc" }
              }
            }
          }
        },
        orderBy: [{ student: { name: "asc" } }, { enrolledAt: "asc" }]
      }
    }
  });

  if (!teachingClass) {
    throw new AppError("FORBIDDEN", "You can only view quiz analytics for your own realms.");
  }

  const activity = await db.activity.findFirst({
    where: {
      id: input.activityId,
      moduleId: input.moduleId,
      module: { classId: input.classId }
    },
    include: {
      module: true,
      quizAttempts: {
        orderBy: [{ submittedAt: "desc" }, { attemptNo: "desc" }]
      }
    }
  });

  if (!activity) {
    throw new AppError("NOT_FOUND", "Quiz mission not found.");
  }

  if (activity.type !== ActivityType.QUIZ) {
    throw new AppError("BAD_REQUEST", "Quiz analytics are only available for quiz missions.");
  }

  const definition = parseQuizDefinition(activity.content);
  if (!definition) {
    throw new AppError("BAD_REQUEST", "This quiz has no valid questions yet.");
  }

  const analytics = calculateQuizAnalytics({
    definition,
    attempts: activity.quizAttempts,
    totalStudents: teachingClass.students.length
  });

  const studentRows = teachingClass.students.map((enrollment) => {
    const attempts = enrollment.student.quizAttempts;
    const sortedByScore = [...attempts].sort((a, b) => Number(b.score) - Number(a.score));
    const bestAttempt = sortedByScore[0] ?? null;
    const latestAttempt = attempts[0] ?? null;

    return {
      studentId: enrollment.studentId,
      studentName: enrollment.student.name,
      studentEmail: enrollment.student.email,
      attemptsUsed: attempts.length,
      bestAttempt,
      latestAttempt,
      hasPassed: attempts.some((attempt) => attempt.passed)
    };
  });

  return {
    activity,
    definition,
    analytics,
    studentRows,
    activeStudentCount: teachingClass.students.length
  };
}
