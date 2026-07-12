import { ActivityType, ClassStatus, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { enrollStudentAction } from "@/app/admin/actions";
import { gradeSubmissionAction } from "@/app/lecturer/actions";
import { completeLessonAction } from "@/app/student/actions";
import { initialAdminActionState } from "@/app/admin/action-state";
import { initialLecturerActionState } from "@/app/lecturer/action-state";
import { initialStudentActionState } from "@/app/student/action-state";
import { db } from "@/lib/db";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  createSubmissionFixture,
  createUser,
  enrollStudentFixture
} from "./fixtures";
import { setMockSession } from "./setup";

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
});
