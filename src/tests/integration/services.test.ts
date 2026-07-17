import { ActivityType, QuestType, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { serializeQuizDefinition } from "@/lib/quiz";
import { getOwnPublishedGrade, publishGrade } from "@/services/grade-service";
import {
  createActivityResource,
  deleteActivityResource,
  updateActivity,
  updateModule,
  updateQuest
} from "@/services/lecturer-service";
import { assertStudentCanAccessActivity, completeActivity } from "@/services/progress-service";
import { getLecturerQuizAnalytics } from "@/services/quiz-analytics-service";
import { attemptQuiz } from "@/services/student-service";

import {
  connectQuestActivityFixture,
  createActivityFixture,
  createClassFixture,
  createCoreBadges,
  createModuleFixture,
  createQuestFixture,
  createUser,
  enrollStudentFixture
} from "./fixtures";

describe("database-backed service rules", () => {
  it("blocks lecturers from updating another lecturer's content", async () => {
    const otherLecturer = await createUser(UserRole.LECTURER, "Other Lecturer");
    const { lecturer, class: teachingClass } = await createClassFixture();
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id);
    const quest = await createQuestFixture(teachingClass.id);

    await expect(
      updateModule({
        lecturerId: otherLecturer.id,
        moduleId: learningModule.id,
        title: "Hijacked Region",
        position: 1,
        isPublished: true
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      updateActivity({
        lecturerId: otherLecturer.id,
        activityId: activity.id,
        moduleId: learningModule.id,
        type: ActivityType.LESSON,
        title: "Hijacked Mission",
        position: 1,
        isRequired: true,
        isPublished: true
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      updateQuest({
        lecturerId: otherLecturer.id,
        questId: quest.id,
        classId: teachingClass.id,
        title: "Hijacked Quest",
        type: QuestType.MAIN,
        position: 1,
        xpReward: 50,
        isOptional: false,
        isPublished: true
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const unchangedClass = await db.class.findUniqueOrThrow({ where: { id: teachingClass.id } });
    expect(unchangedClass.lecturerId).toBe(lecturer.id);
  });

  it("allows lecturers to create and remove resources only for their own missions", async () => {
    const otherLecturer = await createUser(UserRole.LECTURER, "Other Resource Owner");
    const { lecturer, class: teachingClass } = await createClassFixture();
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id);

    await expect(
      createActivityResource({
        lecturerId: otherLecturer.id,
        activityId: activity.id,
        title: "Other Slides",
        fileName: "slides.pdf",
        fileUrl: `s3:mission-resources/${activity.id}/slides.pdf`,
        contentType: "application/pdf",
        size: 1000,
        position: 1
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const resource = await createActivityResource({
      lecturerId: lecturer.id,
      activityId: activity.id,
      title: "Lecture Slides",
      fileName: "slides.pdf",
      fileUrl: `s3:mission-resources/${activity.id}/slides.pdf`,
      contentType: "application/pdf",
      size: 1000,
      position: 1
    });

    await expect(
      deleteActivityResource({
        lecturerId: otherLecturer.id,
        activityId: activity.id,
        resourceId: resource.id
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await deleteActivityResource({
      lecturerId: lecturer.id,
      activityId: activity.id,
      resourceId: resource.id
    });

    await expect(db.activityResource.findUnique({ where: { id: resource.id } })).resolves.toBeNull();
  });

  it("blocks student activity access when not enrolled or content is unpublished", async () => {
    const { class: teachingClass } = await createClassFixture();
    const student = await createUser(UserRole.STUDENT, "Unenrolled Student");
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id);

    await expect(assertStudentCanAccessActivity(activity.id, student.id)).rejects.toMatchObject({
      code: "FORBIDDEN"
    });

    const { student: enrolledStudent } = await enrollStudentFixture(teachingClass.id);
    const hiddenModule = await createModuleFixture(teachingClass.id, {
      title: "Hidden Region",
      position: 2,
      isPublished: false
    });
    const hiddenActivity = await createActivityFixture(hiddenModule.id, {
      title: "Hidden Mission",
      position: 1,
      isPublished: true
    });
    const draftActivity = await createActivityFixture(learningModule.id, {
      title: "Draft Mission",
      position: 2,
      isPublished: false
    });

    await expect(
      assertStudentCanAccessActivity(hiddenActivity.id, enrolledStudent.id)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      assertStudentCanAccessActivity(draftActivity.id, enrolledStudent.id)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces prerequisites and awards quest XP only once through real transactions", async () => {
    await createCoreBadges();
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const firstMission = await createActivityFixture(learningModule.id, {
      title: "First Mission",
      position: 1
    });
    const finalMission = await createActivityFixture(learningModule.id, {
      title: "Final Mission",
      position: 2
    });
    const quest = await createQuestFixture(teachingClass.id, {
      title: "Main Quest",
      xpReward: 120,
      isPublished: true
    });

    await db.activityPrerequisite.create({
      data: {
        activityId: finalMission.id,
        requiredActivityId: firstMission.id
      }
    });
    await connectQuestActivityFixture(quest.id, firstMission.id, 1);
    await connectQuestActivityFixture(quest.id, finalMission.id, 2);

    await expect(completeActivity(finalMission.id, student.id)).rejects.toMatchObject({
      code: "FORBIDDEN"
    });

    await completeActivity(firstMission.id, student.id);
    expect(await db.xPTransaction.count()).toBe(0);

    await completeActivity(finalMission.id, student.id);
    await completeActivity(finalMission.id, student.id);

    const transactions = await db.xPTransaction.findMany();
    const profile = await db.studentProfile.findUniqueOrThrow({ where: { studentId: student.id } });
    const badges = await db.studentBadge.findMany({
      where: { studentId: student.id },
      include: { badge: true }
    });

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      amount: 120,
      classId: teachingClass.id,
      sourceType: "QUEST",
      sourceId: quest.id
    });
    expect(profile.totalXp).toBe(120);
    expect(profile.level).toBe(2);
    expect(badges.map((entry) => entry.badge.name).sort()).toEqual([
      "First Step",
      "Quest Beginner"
    ]);
  });

  it("publishes own grades safely and awards Perfect Score only on full score", async () => {
    await createCoreBadges();
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const otherStudent = await createUser(UserRole.STUDENT, "Other Student");
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      maxScore: 100
    });

    const grade = await db.grade.create({
      data: {
        activityId: activity.id,
        studentId: student.id,
        score: 100,
        feedback: "Excellent",
        gradedById: lecturer.id
      }
    });

    await expect(getOwnPublishedGrade(activity.id, student.id)).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
    await expect(getOwnPublishedGrade(activity.id, otherStudent.id)).rejects.toMatchObject({
      code: "NOT_FOUND"
    });

    await publishGrade(grade.id, lecturer.id);
    const ownGrade = await getOwnPublishedGrade(activity.id, student.id);
    const perfectScoreBadge = await db.studentBadge.findFirst({
      where: {
        studentId: student.id,
        badge: { name: "Perfect Score" }
      }
    });

    expect(ownGrade.score.toString()).toBe("100");
    expect(perfectScoreBadge).not.toBeNull();
    await expect(getOwnPublishedGrade(activity.id, otherStudent.id)).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
  });

  it("protects lecturer quiz analytics by ownership and mission type", async () => {
    const otherLecturer = await createUser(UserRole.LECTURER, "Analytics Outsider");
    const { lecturer, class: teachingClass } = await createClassFixture();
    const learningModule = await createModuleFixture(teachingClass.id);
    const quiz = await createActivityFixture(learningModule.id, {
      type: ActivityType.QUIZ,
      title: "Analytics Quiz",
      maxScore: 1
    });
    const assignment = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      title: "Not A Quiz",
      position: 2,
      maxScore: 10
    });

    await db.activity.update({
      where: { id: quiz.id },
      data: {
        content: serializeQuizDefinition({
          version: 1,
          questions: [
            {
              id: "q1",
              type: "TRUE_FALSE",
              prompt: "Analytics are read-only.",
              options: ["True", "False"],
              correctOptionIndex: 0,
              points: 1
            }
          ]
        })
      }
    });

    await expect(
      getLecturerQuizAnalytics({
        lecturerId: otherLecturer.id,
        classId: teachingClass.id,
        moduleId: learningModule.id,
        activityId: quiz.id
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      getLecturerQuizAnalytics({
        lecturerId: lecturer.id,
        classId: teachingClass.id,
        moduleId: learningModule.id,
        activityId: assignment.id
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps quiz grades based on the best attempt score", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const quiz = await createActivityFixture(learningModule.id, {
      type: ActivityType.QUIZ,
      title: "Best Attempt Quiz",
      maxScore: 10,
      maxAttempts: 2
    });

    await db.activity.update({
      where: { id: quiz.id },
      data: {
        passingScore: 10,
        content: serializeQuizDefinition({
          version: 1,
          questions: [
            {
              id: "q1",
              type: "TRUE_FALSE",
              prompt: "The second answer is correct.",
              options: ["True", "False"],
              correctOptionIndex: 1,
              points: 10
            }
          ]
        })
      }
    });

    await attemptQuiz({ activityId: quiz.id, studentId: student.id, answer_q1: "0" });
    await attemptQuiz({ activityId: quiz.id, studentId: student.id, answer_q1: "1" });

    const grade = await db.grade.findUniqueOrThrow({
      where: { activityId_studentId: { activityId: quiz.id, studentId: student.id } }
    });

    expect(grade.gradedById).toBe(lecturer.id);
    expect(grade.score.toString()).toBe("10");
    expect(grade.publishedAt).not.toBeNull();
  });
});
