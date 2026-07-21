import { ActivityType, AnnouncementStatus, ClassStatus, EnrollmentStatus, QuestType, UserRole, UserStatus } from "@prisma/client";

import { db } from "../../lib/db";
import { hashPassword } from "../../lib/password";

export const e2ePassword = "Password123!";

export const e2eUsers = {
  admin: {
    name: "E2E Admin",
    email: "admin@e2e.questora.dev",
    role: UserRole.ADMIN
  },
  lecturer: {
    name: "E2E Lecturer",
    email: "lecturer@e2e.questora.dev",
    role: UserRole.LECTURER
  },
  student: {
    name: "E2E Student",
    email: "student@e2e.questora.dev",
    role: UserRole.STUDENT
  },
  rival: {
    name: "E2E Rival",
    email: "rival@e2e.questora.dev",
    role: UserRole.STUDENT
  },
  unenrolled: {
    name: "E2E Unenrolled",
    email: "unenrolled@e2e.questora.dev",
    role: UserRole.STUDENT
  }
} as const;

export type E2eSeed = Awaited<ReturnType<typeof resetE2eDatabase>>;

async function clearDatabase() {
  await db.$transaction([
    db.studentBadge.deleteMany(),
    db.badge.deleteMany(),
    db.xPTransaction.deleteMany(),
    db.studentProfile.deleteMany(),
    db.grade.deleteMany(),
    db.submission.deleteMany(),
    db.quizAttempt.deleteMany(),
    db.activityProgress.deleteMany(),
    db.announcement.deleteMany(),
    db.questActivity.deleteMany(),
    db.activityPrerequisite.deleteMany(),
    db.quest.deleteMany(),
    db.activity.deleteMany(),
    db.module.deleteMany(),
    db.classStudent.deleteMany(),
    db.class.deleteMany(),
    db.user.deleteMany()
  ]);
}

async function createUser(user: (typeof e2eUsers)[keyof typeof e2eUsers]) {
  return db.user.create({
    data: {
      name: user.name,
      email: user.email,
      passwordHash: await hashPassword(e2ePassword),
      role: user.role,
      status: UserStatus.ACTIVE,
      ...(user.role === UserRole.STUDENT
        ? {
            profile: {
              create: {
                totalXp: user.email === e2eUsers.rival.email ? 320 : 180,
                level: user.email === e2eUsers.rival.email ? 2 : 2
              }
            }
          }
        : {})
    }
  });
}

export async function resetE2eDatabase() {
  await clearDatabase();

  const [admin, lecturer, student, rival, unenrolled] = await Promise.all([
    createUser(e2eUsers.admin),
    createUser(e2eUsers.lecturer),
    createUser(e2eUsers.student),
    createUser(e2eUsers.rival),
    createUser(e2eUsers.unenrolled)
  ]);

  const teachingClass = await db.class.create({
    data: {
      name: "E2E Realm",
      code: "E2E-REALM",
      description: "A deterministic realm for browser workflow tests.",
      lecturerId: lecturer.id,
      createdById: admin.id,
      status: ClassStatus.ACTIVE
    }
  });

  await db.classStudent.createMany({
    data: [
      { classId: teachingClass.id, studentId: student.id, status: EnrollmentStatus.ACTIVE },
      { classId: teachingClass.id, studentId: rival.id, status: EnrollmentStatus.ACTIVE }
    ]
  });

  const learningModule = await db.module.create({
    data: {
      classId: teachingClass.id,
      title: "E2E Region",
      description: "Published region for browser tests.",
      position: 1,
      isPublished: true
    }
  });

  const assignment = await db.activity.create({
    data: {
      moduleId: learningModule.id,
      type: ActivityType.ASSIGNMENT,
      title: "E2E Assignment",
      description: "Submit written work.",
      content: "Write a short answer for the lecturer.",
      position: 1,
      maxScore: 100,
      passingScore: 60,
      isRequired: true,
      isPublished: true
    }
  });

  const quiz = await db.activity.create({
    data: {
      moduleId: learningModule.id,
      type: ActivityType.QUIZ,
      title: "E2E Quiz",
      description: "One attempt quiz.",
      content: JSON.stringify({
        version: 1,
        questions: [
          {
            id: "q1",
            type: "TRUE_FALSE",
            prompt: "Questora is a learning realm.",
            options: ["True", "False"],
            correctOptionIndex: 0,
            points: 10
          }
        ]
      }),
      position: 2,
      maxScore: 10,
      passingScore: 10,
      maxAttempts: 1,
      isRequired: true,
      isPublished: true
    }
  });

  const reviewQuiz = await db.activity.create({
    data: {
      moduleId: learningModule.id,
      type: ActivityType.QUIZ,
      title: "E2E Review Quiz",
      description: "Two attempt quiz for answer review.",
      content: JSON.stringify({
        version: 1,
        questions: [
          {
            id: "q1",
            type: "TRUE_FALSE",
            prompt: "Analytics can hide correct answers.",
            options: ["True", "False"],
            correctOptionIndex: 0,
            points: 5
          }
        ]
      }),
      position: 3,
      maxScore: 5,
      passingScore: 5,
      maxAttempts: 2,
      isRequired: true,
      isPublished: true
    }
  });

  const quest = await db.quest.create({
    data: {
      classId: teachingClass.id,
      title: "E2E Quest",
      description: "Complete the assignment mission.",
      type: QuestType.MAIN,
      position: 1,
      xpReward: 100,
      isOptional: false,
      isPublished: true
    }
  });

  await db.questActivity.create({
    data: {
      questId: quest.id,
      activityId: assignment.id,
      position: 1
    }
  });

  await db.xPTransaction.createMany({
    data: [
      {
        studentId: student.id,
        classId: teachingClass.id,
        amount: 180,
        sourceType: "QUEST",
        sourceId: quest.id,
        description: "E2E quest reward",
        idempotencyKey: `e2e:quest:${quest.id}:student:${student.id}`
      },
      {
        studentId: rival.id,
        classId: teachingClass.id,
        amount: 320,
        sourceType: "QUEST",
        sourceId: quest.id,
        description: "E2E rival quest reward",
        idempotencyKey: `e2e:quest:${quest.id}:student:${rival.id}`
      }
    ]
  });

  const announcement = await db.announcement.create({
    data: {
      classId: teachingClass.id,
      title: "E2E Welcome Announcement",
      body: "This published update should be visible to enrolled students.",
      status: AnnouncementStatus.PUBLISHED,
      createdById: lecturer.id,
      publishedAt: new Date()
    }
  });

  return {
    users: { admin, lecturer, student, rival, unenrolled },
    class: teachingClass,
    module: learningModule,
    activities: { assignment, quiz, reviewQuiz },
    quest,
    announcement
  };
}
