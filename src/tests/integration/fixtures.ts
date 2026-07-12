import {
  ActivityType,
  ClassStatus,
  EnrollmentStatus,
  QuestType,
  SubmissionStatus,
  UserRole,
  UserStatus
} from "@prisma/client";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

let sequence = 0;

function nextEmail(prefix: string) {
  sequence += 1;
  return `${prefix}-${sequence}@integration.questora.dev`;
}

export async function createUser(role: UserRole, name = role.toLowerCase()) {
  return db.user.create({
    data: {
      name,
      email: nextEmail(name.toLowerCase().replace(/\s+/g, "-")),
      passwordHash: await hashPassword("Password123!"),
      role,
      status: UserStatus.ACTIVE,
      ...(role === UserRole.STUDENT
        ? {
            profile: {
              create: {
                totalXp: 0,
                level: 1
              }
            }
          }
        : {})
    }
  });
}

export async function createClassFixture(params?: {
  adminId?: string;
  lecturerId?: string;
  name?: string;
}) {
  const admin = params?.adminId
    ? await db.user.findUniqueOrThrow({ where: { id: params.adminId } })
    : await createUser(UserRole.ADMIN, "Admin Fixture");
  const lecturer = params?.lecturerId
    ? await db.user.findUniqueOrThrow({ where: { id: params.lecturerId } })
    : await createUser(UserRole.LECTURER, "Lecturer Fixture");

  const teachingClass = await db.class.create({
    data: {
      name: params?.name ?? "Integration Realm",
      code: `INT-${Date.now()}-${sequence}`,
      description: "Integration test class",
      lecturerId: lecturer.id,
      createdById: admin.id,
      status: ClassStatus.ACTIVE
    }
  });

  return { admin, lecturer, class: teachingClass };
}

export async function enrollStudentFixture(classId: string, studentId?: string) {
  const student = studentId
    ? await db.user.findUniqueOrThrow({ where: { id: studentId } })
    : await createUser(UserRole.STUDENT, "Student Fixture");

  const enrollment = await db.classStudent.create({
    data: {
      classId,
      studentId: student.id,
      status: EnrollmentStatus.ACTIVE
    }
  });

  return { student, enrollment };
}

export async function createModuleFixture(classId: string, overrides?: Partial<{
  title: string;
  position: number;
  isPublished: boolean;
}>) {
  return db.module.create({
    data: {
      classId,
      title: overrides?.title ?? "Region One",
      description: "Integration test module",
      position: overrides?.position ?? 1,
      isPublished: overrides?.isPublished ?? true
    }
  });
}

export async function createActivityFixture(moduleId: string, overrides?: Partial<{
  type: ActivityType;
  title: string;
  position: number;
  isRequired: boolean;
  isPublished: boolean;
  maxScore: number;
}>) {
  return db.activity.create({
    data: {
      moduleId,
      type: overrides?.type ?? ActivityType.LESSON,
      title: overrides?.title ?? "Mission One",
      description: "Integration activity",
      content: "Mission content",
      position: overrides?.position ?? 1,
      isRequired: overrides?.isRequired ?? true,
      isPublished: overrides?.isPublished ?? true,
      maxScore: overrides?.maxScore
    }
  });
}

export async function createQuestFixture(classId: string, overrides?: Partial<{
  title: string;
  type: QuestType;
  position: number;
  xpReward: number;
  isPublished: boolean;
}>) {
  return db.quest.create({
    data: {
      classId,
      title: overrides?.title ?? "Quest One",
      description: "Integration quest",
      type: overrides?.type ?? QuestType.MAIN,
      position: overrides?.position ?? 1,
      xpReward: overrides?.xpReward ?? 120,
      isOptional: false,
      isPublished: overrides?.isPublished ?? true
    }
  });
}

export async function connectQuestActivityFixture(
  questId: string,
  activityId: string,
  position = 1
) {
  return db.questActivity.create({
    data: {
      questId,
      activityId,
      position
    }
  });
}

export async function createCoreBadges() {
  await db.badge.createMany({
    data: [
      {
        name: "First Step",
        description: "Complete the first activity",
        conditionType: "ACTIVITY_COMPLETED",
        conditionValue: "1"
      },
      {
        name: "Quest Beginner",
        description: "Complete the first quest",
        conditionType: "QUEST_COMPLETED",
        conditionValue: "1"
      },
      {
        name: "Boss Slayer",
        description: "Complete a boss quest",
        conditionType: "BOSS_QUEST_COMPLETED",
        conditionValue: "1"
      },
      {
        name: "Perfect Score",
        description: "Get a full score on an activity",
        conditionType: "PERFECT_SCORE",
        conditionValue: "1"
      }
    ]
  });
}

export async function createSubmissionFixture(activityId: string, studentId: string) {
  return db.submission.create({
    data: {
      activityId,
      studentId,
      textContent: "Submitted work",
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date()
    }
  });
}
