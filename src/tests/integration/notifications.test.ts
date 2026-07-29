import { ActivityType, AnnouncementStatus, EnrollmentStatus, UserRole, UserStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createAnnouncement, publishAnnouncement } from "@/services/announcement-service";
import { publishGrade } from "@/services/grade-service";
import {
  createActivityResource,
  gradeSubmission,
  publishActivity,
  returnSubmissionForRevision
} from "@/services/lecturer-service";
import {
  getUnreadNotificationCount,
  markNotificationRead
} from "@/services/notification-service";
import { submitAssignment } from "@/services/student-service";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  createSubmissionFixture,
  createUser,
  enrollStudentFixture
} from "./fixtures";

describe("in-app notifications", () => {
  it("counts and marks only the signed-in user's notifications", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const assignment = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      maxScore: 10
    });

    await submitAssignment({
      activityId: assignment.id,
      studentId: student.id,
      textContent: "Submitted work"
    });

    const notification = await db.notification.findFirstOrThrow({
      where: { recipientId: lecturer.id }
    });

    expect(await getUnreadNotificationCount(lecturer.id)).toBe(1);
    expect(await getUnreadNotificationCount(student.id)).toBe(0);

    await expect(
      markNotificationRead({ userId: student.id, notificationId: notification.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await markNotificationRead({ userId: lecturer.id, notificationId: notification.id });
    expect(await getUnreadNotificationCount(lecturer.id)).toBe(0);
  });

  it("notifies active enrolled students once when announcements are published", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const droppedStudent = await createUser(UserRole.STUDENT, "Dropped Notification Student");
    const inactiveStudent = await createUser(UserRole.STUDENT, "Inactive Notification Student");

    await db.user.update({
      where: { id: inactiveStudent.id },
      data: { status: UserStatus.INACTIVE }
    });
    await db.classStudent.createMany({
      data: [
        {
          classId: teachingClass.id,
          studentId: droppedStudent.id,
          status: EnrollmentStatus.DROPPED
        },
        {
          classId: teachingClass.id,
          studentId: inactiveStudent.id,
          status: EnrollmentStatus.ACTIVE
        }
      ]
    });

    const announcement = await createAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      title: "Exam prep",
      body: "Review the latest resources.",
      status: AnnouncementStatus.DRAFT
    });

    await publishAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      announcementId: announcement.id
    });
    await publishAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      announcementId: announcement.id
    });

    const notifications = await db.notification.findMany({
      where: { type: "ANNOUNCEMENT_PUBLISHED" }
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      recipientId: student.id,
      actorId: lecturer.id,
      href: `/student/classes/${teachingClass.id}/announcements`
    });
  });

  it("notifies lecturer submissions and owning students for return and grade publication", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const returnedAssignment = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      title: "Returned Essay",
      maxScore: 10
    });
    const gradedAssignment = await createActivityFixture(learningModule.id, {
      type: ActivityType.PROJECT,
      title: "Published Project",
      position: 2,
      maxScore: 20
    });

    const returnedSubmission = await createSubmissionFixture(returnedAssignment.id, student.id);
    const gradedSubmission = await createSubmissionFixture(gradedAssignment.id, student.id);

    await submitAssignment({
      activityId: returnedAssignment.id,
      studentId: student.id,
      textContent: "Fresh submission"
    });
    await returnSubmissionForRevision({
      lecturerId: lecturer.id,
      submissionId: returnedSubmission.id,
      returnFeedback: "Please add more evidence."
    });
    const grade = await gradeSubmission({
      lecturerId: lecturer.id,
      submissionId: gradedSubmission.id,
      score: 18,
      feedback: "Strong project."
    });
    await publishGrade(grade.id, lecturer.id);

    const lecturerNotifications = await db.notification.findMany({
      where: { recipientId: lecturer.id }
    });
    const studentNotifications = await db.notification.findMany({
      where: { recipientId: student.id },
      orderBy: { createdAt: "asc" }
    });

    expect(lecturerNotifications.some((entry) => entry.type === "SUBMISSION_SUBMITTED")).toBe(true);
    expect(studentNotifications.map((entry) => entry.type).sort()).toEqual([
      "GRADE_DRAFTED",
      "GRADE_PUBLISHED",
      "SUBMISSION_RETURNED"
    ]);
    expect(studentNotifications.every((entry) => entry.recipientId === student.id)).toBe(true);
  });

  it("notifies active students when published missions and resources become available", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id, { isPublished: true });
    const mission = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      title: "Notification Mission",
      isPublished: false
    });

    await publishActivity(mission.id, lecturer.id);
    await createActivityResource({
      lecturerId: lecturer.id,
      activityId: mission.id,
      title: "Reference PDF",
      fileName: "reference.pdf",
      fileUrl: "https://example.com/reference.pdf",
      contentType: "application/pdf",
      size: 1000,
      position: 1
    });

    const notifications = await db.notification.findMany({
      where: { recipientId: student.id },
      orderBy: { createdAt: "asc" }
    });

    expect(notifications.map((entry) => entry.type)).toEqual([
      "MISSION_PUBLISHED",
      "RESOURCE_ADDED"
    ]);
    expect(notifications.every((entry) => entry.href.includes(`/student/classes/${teachingClass.id}`))).toBe(true);
  });
});
