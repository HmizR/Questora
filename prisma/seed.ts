import {
  ActivityType,
  ClassStatus,
  PrismaClient,
  QuestType,
  UserRole
} from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  await prisma.studentBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.xPTransaction.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.activityProgress.deleteMany();
  await prisma.activityPrerequisite.deleteMany();
  await prisma.questActivity.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.module.deleteMany();
  await prisma.classStudent.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword("Password123!");

  const admin = await prisma.user.create({
    data: {
      name: "Ari Admin",
      email: "admin@questora.dev",
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  const lecturers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Lina Vale",
        email: "lecturer1@questora.dev",
        passwordHash,
        role: UserRole.LECTURER
      }
    }),
    prisma.user.create({
      data: {
        name: "Mason Reed",
        email: "lecturer2@questora.dev",
        passwordHash,
        role: UserRole.LECTURER
      }
    })
  ]);

  const students = await Promise.all(
    ["Nova Chen", "Iris Khan", "Theo Park", "Mila Stone", "Kai Morgan"].map((name, index) =>
      prisma.user.create({
        data: {
          name,
          email: `student${index + 1}@questora.dev`,
          passwordHash,
          role: UserRole.STUDENT,
          profile: {
            create: {
              totalXp: 0,
              level: 1
            }
          }
        }
      })
    )
  );

  const [webRealm, dataRealm] = await Promise.all([
    prisma.class.create({
      data: {
        name: "Web Foundations",
        code: "WEB-101",
        description: "A first learning realm for HTML, CSS, TypeScript, and Next.js basics.",
        lecturerId: lecturers[0].id,
        createdById: admin.id,
        status: ClassStatus.ACTIVE,
        startDate: new Date("2026-07-01T00:00:00.000Z")
      }
    }),
    prisma.class.create({
      data: {
        name: "Data Explorers",
        code: "DATA-101",
        description: "Introductory data literacy missions with small analysis projects.",
        lecturerId: lecturers[1].id,
        createdById: admin.id,
        status: ClassStatus.ACTIVE,
        startDate: new Date("2026-07-01T00:00:00.000Z")
      }
    })
  ]);

  await prisma.classStudent.createMany({
    data: [
      { classId: webRealm.id, studentId: students[0].id },
      { classId: webRealm.id, studentId: students[1].id },
      { classId: webRealm.id, studentId: students[2].id },
      { classId: dataRealm.id, studentId: students[2].id },
      { classId: dataRealm.id, studentId: students[3].id },
      { classId: dataRealm.id, studentId: students[4].id }
    ]
  });

  const webRegion = await prisma.module.create({
    data: {
      classId: webRealm.id,
      title: "Region 1: Markup Outpost",
      description: "The opening region for web page structure and styling.",
      position: 1,
      isPublished: true
    }
  });

  const lesson = await prisma.activity.create({
    data: {
      moduleId: webRegion.id,
      type: ActivityType.LESSON,
      title: "Mission 1: Read the Map",
      description: "Learn the structure of an HTML document.",
      content: "Read the lesson notes and identify the purpose of semantic HTML.",
      position: 1,
      isRequired: true,
      isPublished: true
    }
  });

  const assignment = await prisma.activity.create({
    data: {
      moduleId: webRegion.id,
      type: ActivityType.ASSIGNMENT,
      title: "Mission 2: Build a Camp",
      description: "Create a small semantic landing page.",
      content: "Submit a short description and link to your HTML/CSS page.",
      position: 2,
      maxScore: 100,
      passingScore: 60,
      isRequired: true,
      isPublished: true
    }
  });

  const boss = await prisma.activity.create({
    data: {
      moduleId: webRegion.id,
      type: ActivityType.PROJECT,
      title: "Boss Battle: Portfolio Gate",
      description: "Build a simple portfolio page using the region skills.",
      content: "Submit a portfolio page with semantic sections and responsive styling.",
      position: 3,
      maxScore: 100,
      passingScore: 70,
      isRequired: true,
      isPublished: true
    }
  });

  await prisma.activityPrerequisite.createMany({
    data: [
      { activityId: assignment.id, requiredActivityId: lesson.id },
      { activityId: boss.id, requiredActivityId: assignment.id, minimumScore: 60 }
    ]
  });

  const dataRegion = await prisma.module.create({
    data: {
      classId: dataRealm.id,
      title: "Region 1: Pattern Trail",
      description: "A first pass through data vocabulary and simple charts.",
      position: 1,
      isPublished: true
    }
  });

  const dataLesson = await prisma.activity.create({
    data: {
      moduleId: dataRegion.id,
      type: ActivityType.LESSON,
      title: "Mission 1: Spot the Signal",
      content: "Read the short guide to variables, records, and simple summaries.",
      position: 1,
      isRequired: true,
      isPublished: true
    }
  });

  const mainQuest = await prisma.quest.create({
    data: {
      classId: webRealm.id,
      title: "First Steps in the Web Realm",
      description: "Complete the opening lesson and camp-building assignment.",
      type: QuestType.MAIN,
      position: 1,
      xpReward: 150,
      isPublished: true
    }
  });

  const bossQuest = await prisma.quest.create({
    data: {
      classId: webRealm.id,
      title: "Portfolio Gate",
      description: "Clear the region boss battle.",
      type: QuestType.BOSS,
      position: 2,
      xpReward: 300,
      isPublished: true
    }
  });

  const dataQuest = await prisma.quest.create({
    data: {
      classId: dataRealm.id,
      title: "Pattern Trail Begins",
      type: QuestType.MAIN,
      position: 1,
      xpReward: 120,
      isPublished: true
    }
  });

  await prisma.questActivity.createMany({
    data: [
      { questId: mainQuest.id, activityId: lesson.id, position: 1 },
      { questId: mainQuest.id, activityId: assignment.id, position: 2 },
      { questId: bossQuest.id, activityId: boss.id, position: 1 },
      { questId: dataQuest.id, activityId: dataLesson.id, position: 1 }
    ]
  });

  await prisma.badge.createMany({
    data: [
      {
        name: "First Step",
        description: "Complete the first activity.",
        conditionType: "ACTIVITY_COMPLETED_COUNT",
        conditionValue: "1"
      },
      {
        name: "Quest Beginner",
        description: "Complete the first quest.",
        conditionType: "QUEST_COMPLETED_COUNT",
        conditionValue: "1"
      },
      {
        name: "Boss Slayer",
        description: "Complete a boss quest.",
        conditionType: "BOSS_QUEST_COMPLETED_COUNT",
        conditionValue: "1"
      },
      {
        name: "Perfect Score",
        description: "Get a full score on an activity.",
        conditionType: "PERFECT_SCORE_COUNT",
        conditionValue: "1"
      }
    ]
  });

  console.info("Seeded Questora development data.");
  console.info("Password for all development users: Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
