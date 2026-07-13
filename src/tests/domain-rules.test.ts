import { describe, expect, it } from "vitest";

import {
  canAdminEnrollStudent,
  canLecturerManageClass,
  canStudentAccessClass,
  canStudentAccessPublishedActivity,
  canStudentEditSubmission,
  canStudentViewGrade,
  deriveQuestCompletion,
  gradeAndXpRemainSeparate,
  shouldAwardBossSlayer,
  shouldAwardQuestXp
} from "../lib/domain-rules";

describe("domain authorization and gamification rules", () => {
  it("prevents a lecturer from editing another lecturer's class", () => {
    expect(canLecturerManageClass({ id: "lecturer-1", role: "LECTURER" }, "lecturer-2")).toBe(
      false
    );
  });

  it("allows a lecturer to edit their own class", () => {
    expect(canLecturerManageClass({ id: "lecturer-1", role: "LECTURER" }, "lecturer-1")).toBe(
      true
    );
  });

  it("prevents a student from accessing a class they are not enrolled in", () => {
    expect(canStudentAccessClass({ id: "student-1", role: "STUDENT" }, null)).toBe(false);
  });

  it("prevents a student from accessing unpublished activities", () => {
    expect(
      canStudentAccessPublishedActivity({
        session: { id: "student-1", role: "STUDENT" },
        enrollment: { studentId: "student-1", status: "ACTIVE" },
        modulePublished: true,
        activityPublished: false,
        now: new Date("2026-07-10T00:00:00.000Z"),
        prerequisitesSatisfied: true
      })
    ).toBe(false);
  });

  it("prevents activity completion before prerequisites are satisfied", () => {
    expect(
      canStudentAccessPublishedActivity({
        session: { id: "student-1", role: "STUDENT" },
        enrollment: { studentId: "student-1", status: "ACTIVE" },
        modulePublished: true,
        activityPublished: true,
        now: new Date("2026-07-10T00:00:00.000Z"),
        prerequisitesSatisfied: false
      })
    ).toBe(false);
  });

  it("awards quest XP only once", () => {
    expect(shouldAwardQuestXp({ questComplete: true, existingTransaction: false })).toBe(true);
    expect(shouldAwardQuestXp({ questComplete: true, existingTransaction: true })).toBe(false);
  });

  it("keeps XP transaction and profile update as a single reward decision", () => {
    expect(shouldAwardQuestXp({ questComplete: false, existingTransaction: false })).toBe(false);
  });

  it("prevents a student from viewing another student's grade", () => {
    expect(
      canStudentViewGrade({
        session: { id: "student-1", role: "STUDENT" },
        gradeStudentId: "student-2",
        publishedAt: new Date()
      })
    ).toBe(false);
  });

  it("keeps grade score and XP amount separate", () => {
    expect(gradeAndXpRemainSeparate({ gradeScore: 95 })).toBe(true);
    expect(gradeAndXpRemainSeparate({ gradeScore: 95, xpAmount: 150 })).toBe(false);
  });

  it("awards Boss Slayer only after a boss quest is newly completed", () => {
    expect(shouldAwardBossSlayer({ questType: "BOSS", xpWasNewlyAwarded: true })).toBe(true);
    expect(shouldAwardBossSlayer({ questType: "BOSS", xpWasNewlyAwarded: false })).toBe(false);
    expect(shouldAwardBossSlayer({ questType: "MAIN", xpWasNewlyAwarded: true })).toBe(false);
  });

  it("allows an admin to enroll a student into an existing class", () => {
    expect(
      canAdminEnrollStudent({
        session: { id: "admin-1", role: "ADMIN" },
        targetRole: "STUDENT",
        classExists: true
      })
    ).toBe(true);
  });

  it("derives quest completion from required activities only", () => {
    expect(
      deriveQuestCompletion([
        { isRequired: true, status: "COMPLETED" },
        { isRequired: false, status: "NOT_STARTED" }
      ])
    ).toBe(true);
  });

  it("allows assignment/project edits until the submission is graded", () => {
    expect(canStudentEditSubmission(null)).toBe(true);
    expect(canStudentEditSubmission("DRAFT")).toBe(true);
    expect(canStudentEditSubmission("SUBMITTED")).toBe(true);
    expect(canStudentEditSubmission("RETURNED")).toBe(true);
    expect(canStudentEditSubmission("GRADED")).toBe(false);
  });
});
