import { ActivityType, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { GET as exportGrades } from "@/app/api/lecturer/classes/[classId]/grades/export/route";
import { GET as exportRoster } from "@/app/api/lecturer/classes/[classId]/students/export/route";
import { GET as exportQuiz } from "@/app/api/lecturer/classes/[classId]/modules/[moduleId]/activities/[activityId]/quiz/export/route";
import { GET as exportSubmissions } from "@/app/api/lecturer/classes/[classId]/modules/[moduleId]/activities/[activityId]/submissions/export/route";
import { db } from "@/lib/db";
import { serializeQuizDefinition } from "@/lib/quiz";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  createSubmissionFixture,
  createUser,
  enrollStudentFixture
} from "./fixtures";
import { setMockSession } from "./setup";

function request(path: string) {
  return new Request(`http://localhost${path}`);
}

async function text(response: Response) {
  return response.text();
}

describe("lecturer CSV exports", () => {
  it("exports filtered roster rows with student emails", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    await enrollStudentFixture(teachingClass.id);
    const { student } = await enrollStudentFixture(teachingClass.id);
    setMockSession({ id: lecturer.id, name: lecturer.name, email: lecturer.email, role: "LECTURER" });

    const response = await exportRoster(request(`/api/lecturer/classes/${teachingClass.id}/students/export?q=${encodeURIComponent(student.email)}`), {
      params: Promise.resolve({ classId: teachingClass.id })
    });
    const body = await text(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(body).toContain(student.name);
    expect(body).toContain(student.email);
    expect(body).not.toContain("Student Fixture-1");
  });

  it("blocks another lecturer from exporting class data", async () => {
    const outsider = await createUser(UserRole.LECTURER, "Export Outsider");
    const { class: teachingClass } = await createClassFixture();
    setMockSession({ id: outsider.id, name: outsider.name, email: outsider.email, role: "LECTURER" });

    const response = await exportGrades(request(`/api/lecturer/classes/${teachingClass.id}/grades/export`), {
      params: Promise.resolve({ classId: teachingClass.id })
    });

    expect(response.status).toBe(403);
  });

  it("exports grade and submission attention states", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const assignment = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      maxScore: 100
    });
    await createSubmissionFixture(assignment.id, student.id);
    setMockSession({ id: lecturer.id, name: lecturer.name, email: lecturer.email, role: "LECTURER" });

    const gradesResponse = await exportGrades(request(`/api/lecturer/classes/${teachingClass.id}/grades/export?attention=needs-attention`), {
      params: Promise.resolve({ classId: teachingClass.id })
    });
    const submissionsResponse = await exportSubmissions(
      request(`/api/lecturer/classes/${teachingClass.id}/modules/${learningModule.id}/activities/${assignment.id}/submissions/export?status=ungraded`),
      { params: Promise.resolve({ classId: teachingClass.id, moduleId: learningModule.id, activityId: assignment.id }) }
    );

    expect(await text(gradesResponse)).toContain("ungraded");
    expect(await text(submissionsResponse)).toContain("Yes");
  });

  it("rejects submission export for non-submission missions and quiz export for non-quiz missions", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const learningModule = await createModuleFixture(teachingClass.id);
    const lesson = await createActivityFixture(learningModule.id, { type: ActivityType.LESSON });
    setMockSession({ id: lecturer.id, name: lecturer.name, email: lecturer.email, role: "LECTURER" });

    const submissionsResponse = await exportSubmissions(
      request(`/api/lecturer/classes/${teachingClass.id}/modules/${learningModule.id}/activities/${lesson.id}/submissions/export`),
      { params: Promise.resolve({ classId: teachingClass.id, moduleId: learningModule.id, activityId: lesson.id }) }
    );
    const quizResponse = await exportQuiz(
      request(`/api/lecturer/classes/${teachingClass.id}/modules/${learningModule.id}/activities/${lesson.id}/quiz/export`),
      { params: Promise.resolve({ classId: teachingClass.id, moduleId: learningModule.id, activityId: lesson.id }) }
    );

    expect(submissionsResponse.status).toBe(400);
    expect(quizResponse.status).toBe(400);
  });

  it("exports filtered quiz analytics rows", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const quiz = await createActivityFixture(learningModule.id, {
      type: ActivityType.QUIZ,
      maxScore: 1,
      maxAttempts: 1
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
              prompt: "Export works.",
              options: ["True", "False"],
              correctOptionIndex: 0,
              points: 1
            }
          ]
        })
      }
    });
    await db.quizAttempt.create({
      data: {
        activityId: quiz.id,
        studentId: student.id,
        attemptNo: 1,
        score: 0,
        maxScore: 1,
        passed: false,
        answers: { selected: { q1: 1 }, results: [] }
      }
    });
    setMockSession({ id: lecturer.id, name: lecturer.name, email: lecturer.email, role: "LECTURER" });

    const response = await exportQuiz(
      request(`/api/lecturer/classes/${teachingClass.id}/modules/${learningModule.id}/activities/${quiz.id}/quiz/export?status=not-passed&attention=needs-attention`),
      { params: Promise.resolve({ classId: teachingClass.id, moduleId: learningModule.id, activityId: quiz.id }) }
    );
    const body = await text(response);

    expect(response.status).toBe(200);
    expect(body).toContain(student.email);
    expect(body).toContain("not-passed");
    expect(body).toContain("Yes");
  });
});
