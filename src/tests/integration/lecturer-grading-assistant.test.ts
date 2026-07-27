import { ActivityType, SubmissionStatus, UserRole } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");

  return {
    ...actual,
    downloadStorageObject: vi.fn()
  };
});

import { POST as gradingAssistant } from "@/app/api/lecturer/grading-assistant/route";
import { db } from "@/lib/db";
import { downloadStorageObject } from "@/lib/storage";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  createSubmissionFixture,
  createUser,
  enrollStudentFixture
} from "./fixtures";
import { setMockSession } from "./setup";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/lecturer/grading-assistant", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function requestBodies(fetchMock: { mock: { calls: Array<[unknown, RequestInit?]> } }) {
  return fetchMock.mock.calls.map((call) => String(call[1]?.body ?? ""));
}

function mockOllamaSuggestion(suggestion = "## Submission summary\nUseful draft feedback.") {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    Response.json({
      message: { content: suggestion }
    })
  );
}

const downloadStorageObjectMock = vi.mocked(downloadStorageObject);

describe("lecturer grading assistant API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    downloadStorageObjectMock.mockReset();
  });

  it("allows the assigned lecturer to draft feedback for an assignment submission", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const otherStudent = await createUser(UserRole.STUDENT, "Other Student");
    await enrollStudentFixture(teachingClass.id, otherStudent.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      title: "Evidence Essay",
      maxScore: 100
    });
    const submission = await createSubmissionFixture(activity.id, student.id);
    await db.submission.create({
      data: {
        activityId: activity.id,
        studentId: otherStudent.id,
        textContent: "SHOULD_NOT_REACH_GRADING_PROVIDER",
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date()
      }
    });
    await db.submission.update({
      where: { id: submission.id },
      data: {
        textContent: "The student explains claim evidence reasoning with examples.",
        fileUrl: `s3:submissions/${activity.id}/${student.id}/essay.txt`
      }
    });
    downloadStorageObjectMock.mockResolvedValue(
      Buffer.from("Submitted file paragraph about source reliability and supporting details.", "utf8")
    );
    setMockSession({
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      role: "LECTURER"
    });
    const fetchMock = mockOllamaSuggestion(
      "## Submission summary\nThe submission explains evidence.\n\n## Strengths\nSpecific examples."
    );

    const response = await gradingAssistant(jsonRequest({ submissionId: submission.id }));
    const body = await json(response);
    const providerBody = requestBodies(fetchMock).join("\n");

    expect(response.status).toBe(200);
    expect(body.suggestion).toContain("## Submission summary");
    expect(JSON.stringify(body.sources)).toContain("Evidence Essay");
    expect(providerBody).toContain("The student explains claim evidence reasoning");
    expect(providerBody).toContain("File attached: Yes. Extracted text from the submitted file is available");
    expect(providerBody).toContain("Submitted file paragraph about source reliability");
    expect(JSON.stringify(body.sources)).toContain("Submitted file");
    expect(providerBody).toContain("Do not suggest, estimate, calculate, or imply a numeric score");
    expect(providerBody).not.toContain("SHOULD_NOT_REACH_GRADING_PROVIDER");
  });

  it("blocks another lecturer from drafting feedback", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const otherLecturer = await createUser(UserRole.LECTURER, "Other Lecturer");
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.PROJECT
    });
    const submission = await createSubmissionFixture(activity.id, student.id);
    setMockSession({
      id: otherLecturer.id,
      name: otherLecturer.name,
      email: otherLecturer.email,
      role: "LECTURER"
    });
    const fetchMock = mockOllamaSuggestion();

    const response = await gradingAssistant(jsonRequest({ submissionId: submission.id }));

    expect(lecturer.id).not.toBe(otherLecturer.id);
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-assignment missions and missing submissions", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const lesson = await createActivityFixture(learningModule.id, {
      type: ActivityType.LESSON
    });
    const lessonSubmission = await createSubmissionFixture(lesson.id, student.id);
    setMockSession({
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      role: "LECTURER"
    });

    const lessonResponse = await gradingAssistant(jsonRequest({ submissionId: lessonSubmission.id }));
    const missingResponse = await gradingAssistant(
      jsonRequest({ submissionId: "cmissing00000000000000000" })
    );

    expect(lessonResponse.status).toBe(400);
    expect(missingResponse.status).toBe(404);
  });

  it("returns a safe typed error when the AI provider fails", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    const submission = await createSubmissionFixture(activity.id, student.id);
    setMockSession({
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      role: "LECTURER"
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Nope", { status: 500 }));

    const response = await gradingAssistant(jsonRequest({ submissionId: submission.id }));
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      message: "The AI assistant is unavailable right now."
    });
  });
});
