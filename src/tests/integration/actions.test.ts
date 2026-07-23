import { ActivityType, ClassStatus, SubmissionStatus, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { enrollStudentAction } from "@/app/admin/actions";
import { changeOwnPasswordAction, updateOwnProfileAction } from "@/app/account/actions";
import { gradeSubmissionAction } from "@/app/lecturer/actions";
import { completeLessonAction, submitAssignmentAction } from "@/app/student/actions";
import { initialAccountActionState } from "@/app/account/action-state";
import { initialAdminActionState } from "@/app/admin/action-state";
import { initialLecturerActionState } from "@/app/lecturer/action-state";
import { initialStudentActionState } from "@/app/student/action-state";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  createSubmissionFixture,
  createUser,
  enrollStudentFixture
} from "./fixtures";
import { clearMockSession, setMockSession } from "./setup";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("database-backed server actions", () => {
  it("allows an admin action to enroll a student", async () => {
    const { admin, class: teachingClass } = await createClassFixture();
    const student = await createUser(UserRole.STUDENT, "Action Student");
    setMockSession({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "ADMIN"
    });

    const result = await enrollStudentAction(
      initialAdminActionState,
      formData({ classId: teachingClass.id, studentId: student.id })
    );
    const enrollment = await db.classStudent.findUnique({
      where: {
        classId_studentId: {
          classId: teachingClass.id,
          studentId: student.id
        }
      }
    });

    expect(result).toMatchObject({ ok: true });
    expect(enrollment?.status).toBe("ACTIVE");
  });

  it("uses the session student id when completing a lesson", async () => {
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const otherStudent = await createUser(UserRole.STUDENT, "Spoofed Student");
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, { type: ActivityType.LESSON });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });

    const result = await completeLessonAction(
      initialStudentActionState,
      formData({ activityId: activity.id, studentId: otherStudent.id })
    );
    const sessionProgress = await db.activityProgress.findUnique({
      where: { activityId_studentId: { activityId: activity.id, studentId: student.id } }
    });
    const spoofedProgress = await db.activityProgress.findUnique({
      where: { activityId_studentId: { activityId: activity.id, studentId: otherStudent.id } }
    });

    expect(result).toMatchObject({ ok: true });
    expect(sessionProgress?.status).toBe("COMPLETED");
    expect(spoofedProgress).toBeNull();
  });

  it("accepts protected s3 storage references for assignment submissions", async () => {
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    const storageRef = `s3:submissions/${activity.id}/${student.id}/submission.pdf`;
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });

    const result = await submitAssignmentAction(
      initialStudentActionState,
      formData({ activityId: activity.id, fileUrl: storageRef, textContent: "" })
    );
    const submission = await db.submission.findUnique({
      where: { activityId_studentId: { activityId: activity.id, studentId: student.id } }
    });

    expect(result).toMatchObject({ ok: true });
    expect(submission?.fileUrl).toBe(storageRef);
    expect(await db.submissionRevision.count()).toBe(0);
  });

  it("preserves previous assignment submissions as revisions before resubmission", async () => {
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });

    await submitAssignmentAction(
      initialStudentActionState,
      formData({
        activityId: activity.id,
        textContent: "First version",
        fileUrl: `s3:submissions/${activity.id}/${student.id}/first.pdf`
      })
    );
    await submitAssignmentAction(
      initialStudentActionState,
      formData({
        activityId: activity.id,
        textContent: "Second version",
        fileUrl: `s3:submissions/${activity.id}/${student.id}/second.pdf`
      })
    );
    await submitAssignmentAction(
      initialStudentActionState,
      formData({
        activityId: activity.id,
        textContent: "Third version",
        fileUrl: `s3:submissions/${activity.id}/${student.id}/third.pdf`
      })
    );

    const submission = await db.submission.findUniqueOrThrow({
      where: { activityId_studentId: { activityId: activity.id, studentId: student.id } },
      include: { revisions: { orderBy: { revisionNo: "asc" } } }
    });

    expect(submission.textContent).toBe("Third version");
    expect(submission.fileUrl).toBe(`s3:submissions/${activity.id}/${student.id}/third.pdf`);
    expect(submission.revisions).toHaveLength(2);
    expect(submission.revisions[0]).toMatchObject({
      revisionNo: 1,
      textContent: "First version",
      fileUrl: `s3:submissions/${activity.id}/${student.id}/first.pdf`,
      status: SubmissionStatus.SUBMITTED
    });
    expect(submission.revisions[1]).toMatchObject({
      revisionNo: 2,
      textContent: "Second version",
      fileUrl: `s3:submissions/${activity.id}/${student.id}/second.pdf`,
      status: SubmissionStatus.SUBMITTED
    });
  });

  it("blocks resubmission after grading without creating another revision", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    const submission = await createSubmissionFixture(activity.id, student.id);
    await db.submissionRevision.create({
      data: {
        submissionId: submission.id,
        activityId: activity.id,
        studentId: student.id,
        revisionNo: 1,
        textContent: "Previous version",
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date()
      }
    });

    setMockSession({
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      role: "LECTURER"
    });
    await gradeSubmissionAction(
      initialLecturerActionState,
      formData({ submissionId: submission.id, score: "88", feedback: "Latest version graded" })
    );

    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });
    const result = await submitAssignmentAction(
      initialStudentActionState,
      formData({ activityId: activity.id, textContent: "Late edit", fileUrl: "" })
    );

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await db.submissionRevision.count({ where: { submissionId: submission.id } })).toBe(1);
    await expect(
      db.grade.findUniqueOrThrow({
        where: { activityId_studentId: { activityId: activity.id, studentId: student.id } }
      })
    ).resolves.toMatchObject({ feedback: "Latest version graded" });
  });

  it("rejects grading by a lecturer who does not own the class", async () => {
    const otherLecturer = await createUser(UserRole.LECTURER, "Action Other Lecturer");
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, { type: ActivityType.ASSIGNMENT });
    const submission = await createSubmissionFixture(activity.id, student.id);
    setMockSession({
      id: otherLecturer.id,
      name: otherLecturer.name,
      email: otherLecturer.email,
      role: "LECTURER"
    });

    const result = await gradeSubmissionAction(
      initialLecturerActionState,
      formData({ submissionId: submission.id, score: "90", feedback: "Nice work" })
    );
    const gradeCount = await db.grade.count();

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(gradeCount).toBe(0);
  });

  it("returns typed validation errors without writing data", async () => {
    const admin = await createUser(UserRole.ADMIN, "Validation Admin");
    const lecturer = await createUser(UserRole.LECTURER, "Validation Lecturer");
    setMockSession({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "ADMIN"
    });

    const result = await (
      await import("@/app/admin/actions")
    ).createClassAction(
      initialAdminActionState,
      formData({
        name: "",
        code: "INVALID",
        lecturerId: lecturer.id,
        status: ClassStatus.ACTIVE
      })
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" }
    });
    expect(await db.class.count()).toBe(0);
  });

  it("updates only the signed-in user's own profile", async () => {
    const user = await createUser(UserRole.STUDENT, "Profile Owner");
    const otherUser = await createUser(UserRole.STUDENT, "Other Profile");
    setMockSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "STUDENT"
    });

    const result = await updateOwnProfileAction(
      initialAccountActionState,
      formData({
        userId: otherUser.id,
        name: "Updated Profile Owner",
        avatarUrl: "https://example.com/avatar.png"
      })
    );
    const updatedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const untouchedUser = await db.user.findUniqueOrThrow({ where: { id: otherUser.id } });

    expect(result).toMatchObject({ ok: true });
    expect(updatedUser.name).toBe("Updated Profile Owner");
    expect(updatedUser.avatarUrl).toBe("https://example.com/avatar.png");
    expect(untouchedUser.name).toBe("Other Profile");
  });

  it("accepts protected s3 storage references for own avatar", async () => {
    const user = await createUser(UserRole.STUDENT, "Avatar Owner");
    const storageRef = `s3:avatars/${user.id}/avatar.png`;
    setMockSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "STUDENT"
    });

    const result = await updateOwnProfileAction(
      initialAccountActionState,
      formData({
        name: "Avatar Owner Updated",
        avatarUrl: storageRef
      })
    );
    const updatedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(result).toMatchObject({ ok: true });
    expect(updatedUser.avatarUrl).toBe(storageRef);
  });

  it("changes own password only when the current password is valid", async () => {
    const user = await createUser(UserRole.STUDENT, "Password Owner");
    setMockSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "STUDENT"
    });

    const rejected = await changeOwnPasswordAction(
      initialAccountActionState,
      formData({
        currentPassword: "WrongPassword123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!"
      })
    );

    expect(rejected).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });

    const accepted = await changeOwnPasswordAction(
      initialAccountActionState,
      formData({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!"
      })
    );
    const updatedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(accepted).toMatchObject({ ok: true });
    expect(await verifyPassword("NewPassword123!", updatedUser.passwordHash)).toBe(true);
    expect(await verifyPassword("Password123!", updatedUser.passwordHash)).toBe(false);
  });

  it("requires authentication for account actions", async () => {
    clearMockSession();

    const result = await updateOwnProfileAction(
      initialAccountActionState,
      formData({ name: "Anonymous Update", avatarUrl: "" })
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "AUTHENTICATION_REQUIRED" }
    });
  });

  it("allows admins to reset a user password without changing role or status", async () => {
    const admin = await createUser(UserRole.ADMIN, "Reset Admin");
    const student = await createUser(UserRole.STUDENT, "Reset Student");
    await db.user.update({ where: { id: student.id }, data: { status: "INACTIVE" } });
    setMockSession({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "ADMIN"
    });

    const result = await (
      await import("@/app/admin/actions")
    ).resetUserPasswordAction(
      initialAdminActionState,
      formData({
        userId: student.id,
        newPassword: "Temporary123!",
        confirmPassword: "Temporary123!"
      })
    );
    const updatedStudent = await db.user.findUniqueOrThrow({ where: { id: student.id } });

    expect(result).toMatchObject({ ok: true });
    expect(updatedStudent.role).toBe("STUDENT");
    expect(updatedStudent.status).toBe("INACTIVE");
    expect(await verifyPassword("Temporary123!", updatedStudent.passwordHash)).toBe(true);
  });

  it("blocks non-admin password resets and returns validation mismatches", async () => {
    const lecturer = await createUser(UserRole.LECTURER, "Reset Lecturer");
    const student = await createUser(UserRole.STUDENT, "Blocked Reset Student");
    setMockSession({
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      role: "LECTURER"
    });

    const forbidden = await (
      await import("@/app/admin/actions")
    ).resetUserPasswordAction(
      initialAdminActionState,
      formData({
        userId: student.id,
        newPassword: "Temporary123!",
        confirmPassword: "Temporary123!"
      })
    );
    const invalid = await (
      await import("@/app/admin/actions")
    ).resetUserPasswordAction(
      initialAdminActionState,
      formData({
        userId: student.id,
        newPassword: "Temporary123!",
        confirmPassword: "Different123!"
      })
    );

    expect(forbidden).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(invalid).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });
});
