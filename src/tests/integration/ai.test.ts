import { ActivityResourceTextStatus, ActivityType, UserRole } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as chat } from "@/app/api/ai/chat/route";
import { POST as streamChat } from "@/app/api/ai/chat/stream/route";
import { db } from "@/lib/db";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  enrollStudentFixture
} from "./fixtures";
import { clearMockSession, setMockSession } from "./setup";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

async function text(response: Response) {
  return response.text();
}

type FetchSpy = {
  mock: {
    calls: Array<[unknown, RequestInit?]>;
  };
};

function requestBodies(fetchMock: FetchSpy) {
  return fetchMock.mock.calls.map((call) => String(call[1]?.body ?? ""));
}

function findAssistantRequestBody(fetchMock: FetchSpy) {
  return (
    requestBodies(fetchMock).find((body) => body.includes("Authorized Questora context")) ?? ""
  );
}

function mockOllama(answer = "Study the mission instructions and resources first.") {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    Response.json({
      message: { content: answer }
    })
  );
}

function mockOllamaStream(chunks: string[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          chunks.forEach((chunk, index) => {
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({
                  message: { content: chunk },
                  done: index === chunks.length - 1
                })}\n`
              )
            );
          });
          controller.close();
        }
      })
    );
  });
}

describe("AI chat API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated chat requests", async () => {
    clearMockSession();

    const response = await chat(jsonRequest({ message: "Help", context: { type: "GENERIC" } }));
    const streamResponse = await streamChat(
      jsonRequest({ message: "Help", context: { type: "GENERIC" } })
    );

    expect(response.status).toBe(401);
    expect(streamResponse.status).toBe(401);
  });

  it("allows an enrolled student to ask about a published activity", async () => {
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      title: "Context Mission"
    });
    await db.activityResource.create({
      data: {
        activityId: activity.id,
        title: "Required Brief",
        fileName: "brief.pdf",
        fileUrl: "s3:mission-resources/example/brief.pdf",
        contentType: "application/pdf",
        size: 1000,
        position: 1,
        createdById: teachingClass.lecturerId,
        kind: "READING",
        isRequired: true,
        description: "Read this before answering.",
        textStatus: ActivityResourceTextStatus.READY,
        textExtractedAt: new Date(),
        extractedTexts: {
          create: {
            chunkIndex: 0,
            content: "Use claim evidence reasoning when answering the E2E resource prompt."
          }
        }
      }
    });
    await db.activityResource.create({
      data: {
        activityId: activity.id,
        title: "Broken PDF",
        fileName: "broken.pdf",
        fileUrl: "s3:mission-resources/example/broken.pdf",
        contentType: "application/pdf",
        size: 1000,
        position: 2,
        createdById: teachingClass.lecturerId,
        textStatus: ActivityResourceTextStatus.READY,
        textExtractedAt: new Date(),
        extractedTexts: {
          create: {
            chunkIndex: 0,
            content: `${"\u0001".repeat(80)}SHOULD_NOT_REACH_PROVIDER`
          }
        }
      }
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });
    const fetchMock = mockOllama("Use the Required Brief and mission instructions.");

    const response = await chat(
      jsonRequest({
        message: "What should I do first?",
        context: {
          type: "STUDENT_ACTIVITY",
          classId: teachingClass.id,
          activityId: activity.id
        }
      })
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.contextLabel).toBe("Using current mission");
    expect(body.answer).toBe("Use the Required Brief and mission instructions.");
    expect(JSON.stringify(body.sources)).toContain("Required Brief");
    const assistantBody = findAssistantRequestBody(fetchMock);
    expect(assistantBody).toContain("Required Brief");
    expect(assistantBody).toContain(
      "Use claim evidence reasoning when answering the E2E resource prompt."
    );
    expect(assistantBody).not.toContain("SHOULD_NOT_REACH_PROVIDER");
  });

  it("streams an enrolled student's published activity answer with metadata", async () => {
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT,
      title: "Streaming Mission"
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });
    mockOllamaStream(["Streamed ", "answer"]);

    const response = await streamChat(
      jsonRequest({
        message: "Give me a hint",
        context: {
          type: "STUDENT_ACTIVITY",
          classId: teachingClass.id,
          activityId: activity.id
        }
      })
    );
    const body = await text(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body).toContain("event: meta");
    expect(body).toContain("Using current mission");
    expect(body).toContain("Streaming Mission");
    expect(body).toContain('event: delta\ndata: {"content":"Streamed "}');
    expect(body).toContain('event: delta\ndata: {"content":"answer"}');
    expect(body).toContain("event: done");
  });

  it("blocks a student from another class and unpublished activity context", async () => {
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const outsiderClass = await createClassFixture({ name: "Other Realm" });
    const outsiderModule = await createModuleFixture(outsiderClass.class.id);
    const outsiderActivity = await createActivityFixture(outsiderModule.id);
    const privateModule = await createModuleFixture(teachingClass.id, { position: 2 });
    const privateActivity = await createActivityFixture(privateModule.id, {
      isPublished: false
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });
    const fetchMock = mockOllama();

    const outsiderResponse = await chat(
      jsonRequest({
        message: "Help",
        context: {
          type: "STUDENT_ACTIVITY",
          classId: outsiderClass.class.id,
          activityId: outsiderActivity.id
        }
      })
    );
    const unpublishedResponse = await chat(
      jsonRequest({
        message: "Help",
        context: {
          type: "STUDENT_ACTIVITY",
          classId: teachingClass.id,
          activityId: privateActivity.id
        }
      })
    );

    expect(outsiderResponse.status).toBe(403);
    expect(unpublishedResponse.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();

    const unpublishedStreamResponse = await streamChat(
      jsonRequest({
        message: "Help",
        context: {
          type: "STUDENT_ACTIVITY",
          classId: teachingClass.id,
          activityId: privateActivity.id
        }
      })
    );
    expect(unpublishedStreamResponse.status).toBe(403);
  });

  it("uses enrolled class context and generic protected context safely", async () => {
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id, { title: "Context Region" });
    await createActivityFixture(learningModule.id, { title: "Published Mission" });
    await createActivityFixture(learningModule.id, {
      title: "Draft Mission",
      isPublished: false,
      position: 2
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });
    const fetchMock = mockOllama("Here is the realm summary.");

    const classResponse = await chat(
      jsonRequest({
        message: "Summarize this realm",
        context: { type: "STUDENT_CLASS", classId: teachingClass.id }
      })
    );
    const genericResponse = await chat(
      jsonRequest({
        message: "How do I use Questora?",
        context: { type: "GENERIC" }
      })
    );

    expect(classResponse.status).toBe(200);
    expect(genericResponse.status).toBe(200);
    const bodies = requestBodies(fetchMock);
    expect(bodies.some((body) => body.includes("Published Mission"))).toBe(true);
    expect(bodies.some((body) => body.includes("Draft Mission"))).toBe(false);
    expect(bodies.some((body) => body.includes("without page-specific learning context"))).toBe(
      true
    );
  });

  it("returns a safe typed error when the provider fails", async () => {
    const student = await db.user.create({
      data: {
        name: "Generic Student",
        email: "generic-student@integration.questora.dev",
        passwordHash: "hash",
        role: UserRole.STUDENT,
        status: "ACTIVE"
      }
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Nope", { status: 500 }));

    const response = await chat(
      jsonRequest({
        message: "Help",
        context: { type: "GENERIC" }
      })
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      code: "BAD_REQUEST",
      message: "The AI assistant is unavailable right now."
    });
  });

  it("emits a safe stream error when the provider fails after authorization", async () => {
    const student = await db.user.create({
      data: {
        name: "Streaming Student",
        email: "streaming-student@integration.questora.dev",
        passwordHash: "hash",
        role: UserRole.STUDENT,
        status: "ACTIVE"
      }
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Nope", { status: 500 }));

    const response = await streamChat(
      jsonRequest({
        message: "Help",
        context: { type: "GENERIC" }
      })
    );
    const body = await text(response);

    expect(response.status).toBe(200);
    expect(body).toContain("event: meta");
    expect(body).toContain("event: error");
    expect(body).toContain("The AI assistant is unavailable right now.");
  });
});
