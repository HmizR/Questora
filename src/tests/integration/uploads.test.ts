import { ActivityType, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { POST as downloadUpload } from "@/app/api/uploads/download/route";
import { POST as presignUpload } from "@/app/api/uploads/presign/route";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  createUser,
  enrollStudentFixture
} from "./fixtures";
import { clearMockSession, setMockSession } from "./setup";

process.env.S3_BUCKET = "questora-test";
process.env.S3_REGION = "us-east-1";
process.env.S3_ACCESS_KEY_ID = "test-access-key";
process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
process.env.S3_ENDPOINT = "https://s3.test.local";
process.env.S3_FORCE_PATH_STYLE = "true";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/uploads/presign", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("upload presign APIs", () => {
  it("rejects unauthenticated upload and download requests", async () => {
    clearMockSession();

    const uploadResponse = await presignUpload(
      jsonRequest({
        intent: "AVATAR",
        fileName: "avatar.png",
        contentType: "image/png",
        size: 1000
      })
    );
    const downloadResponse = await downloadUpload(
      jsonRequest({
        intent: "AVATAR",
        storageRef: "s3:avatars/someone/file.png"
      })
    );

    expect(uploadResponse.status).toBe(401);
    expect(downloadResponse.status).toBe(401);
  });

  it("uses the session user for avatar upload keys", async () => {
    const user = await createUser(UserRole.STUDENT, "Avatar Student");
    setMockSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "STUDENT"
    });

    const response = await presignUpload(
      jsonRequest({
        intent: "AVATAR",
        fileName: "avatar.png",
        contentType: "image/png",
        size: 1000,
        userId: "spoofed-user"
      })
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.storageRef).toEqual(expect.stringContaining(`s3:avatars/${user.id}/`));
    expect(body.storageRef).not.toEqual(expect.stringContaining("spoofed-user"));
    expect(body.uploadUrl).toEqual(expect.stringContaining("questora-test"));
  });

  it("allows enrolled students to presign assignment submissions only", async () => {
    const { class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const learningModule = await createModuleFixture(teachingClass.id);
    const assignment = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    const lesson = await createActivityFixture(learningModule.id, {
      type: ActivityType.LESSON,
      position: 2
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });

    const accepted = await presignUpload(
      jsonRequest({
        intent: "SUBMISSION",
        activityId: assignment.id,
        fileName: "paper.pdf",
        contentType: "application/pdf",
        size: 1000
      })
    );
    const rejected = await presignUpload(
      jsonRequest({
        intent: "SUBMISSION",
        activityId: lesson.id,
        fileName: "notes.pdf",
        contentType: "application/pdf",
        size: 1000
      })
    );
    const acceptedBody = await json(accepted);

    expect(accepted.status).toBe(200);
    expect(acceptedBody.storageRef).toEqual(
      expect.stringContaining(`s3:submissions/${assignment.id}/${student.id}/`)
    );
    expect(rejected.status).toBe(403);
  });

  it("blocks student submission uploads for classes they are not enrolled in", async () => {
    const student = await createUser(UserRole.STUDENT, "Blocked Upload Student");
    const { class: teachingClass } = await createClassFixture();
    const learningModule = await createModuleFixture(teachingClass.id);
    const assignment = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });

    const response = await presignUpload(
      jsonRequest({
        intent: "SUBMISSION",
        activityId: assignment.id,
        fileName: "paper.pdf",
        contentType: "application/pdf",
        size: 1000
      })
    );

    expect(response.status).toBe(403);
  });

  it("allows lecturers to presign mission resources only for assigned classes", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const learningModule = await createModuleFixture(teachingClass.id);
    const activity = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    const otherLecturer = await createUser(UserRole.LECTURER, "Other Resource Lecturer");
    setMockSession({
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      role: "LECTURER"
    });

    const accepted = await presignUpload(
      jsonRequest({
        intent: "MISSION_RESOURCE",
        activityId: activity.id,
        fileName: "slides.pptx",
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        size: 1000
      })
    );

    setMockSession({
      id: otherLecturer.id,
      name: otherLecturer.name,
      email: otherLecturer.email,
      role: "LECTURER"
    });

    const rejected = await presignUpload(
      jsonRequest({
        intent: "MISSION_RESOURCE",
        activityId: activity.id,
        fileName: "slides.pptx",
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        size: 1000
      })
    );

    expect(accepted.status).toBe(200);
    expect(rejected.status).toBe(403);
  });

  it("authorizes protected download URLs by intent and storage scope", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const otherStudent = await createUser(UserRole.STUDENT, "Other Download Student");
    const learningModule = await createModuleFixture(teachingClass.id);
    const assignment = await createActivityFixture(learningModule.id, {
      type: ActivityType.ASSIGNMENT
    });
    setMockSession({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT"
    });

    const accepted = await downloadUpload(
      jsonRequest({
        intent: "SUBMISSION",
        activityId: assignment.id,
        storageRef: `s3:submissions/${assignment.id}/${student.id}/file.pdf`
      })
    );
    const rejected = await downloadUpload(
      jsonRequest({
        intent: "SUBMISSION",
        activityId: assignment.id,
        storageRef: `s3:submissions/${assignment.id}/${otherStudent.id}/file.pdf`
      })
    );
    const acceptedBody = await json(accepted);

    expect(accepted.status).toBe(200);
    expect(acceptedBody.downloadUrl).toEqual(expect.stringContaining("questora-test"));
    expect(rejected.status).toBe(403);

    setMockSession({
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      role: "LECTURER"
    });

    const lecturerDownload = await downloadUpload(
      jsonRequest({
        intent: "SUBMISSION",
        activityId: assignment.id,
        storageRef: `s3:submissions/${assignment.id}/${student.id}/file.pdf`
      })
    );

    expect(lecturerDownload.status).toBe(200);
  });
});
