import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import {
  createStorageKey,
  parseStorageRef,
  sanitizeFileName,
  toStorageRef,
  validateUploadFile
} from "@/lib/storage";

function expectAppError(fn: () => unknown, code = "VALIDATION_ERROR") {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
    return;
  }

  throw new Error("Expected AppError");
}

describe("storage helpers", () => {
  it("validates allowed and disallowed upload file types", () => {
    expect(() =>
      validateUploadFile({ intent: "AVATAR", contentType: "image/png", size: 1024 })
    ).not.toThrow();
    expect(() =>
      validateUploadFile({
        intent: "SUBMISSION",
        contentType: "application/pdf",
        size: 1024
      })
    ).not.toThrow();
    expect(() =>
      validateUploadFile({
        intent: "MISSION_RESOURCE",
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        size: 1024
      })
    ).not.toThrow();

    expectAppError(() =>
      validateUploadFile({ intent: "AVATAR", contentType: "application/pdf", size: 1024 })
    );
    expectAppError(() =>
      validateUploadFile({
        intent: "SUBMISSION",
        contentType: "application/x-msdownload",
        size: 1024
      })
    );
  });

  it("validates file sizes by intent", () => {
    expectAppError(() =>
      validateUploadFile({
        intent: "AVATAR",
        contentType: "image/jpeg",
        size: 2 * 1024 * 1024 + 1
      })
    );
    expectAppError(() =>
      validateUploadFile({
        intent: "SUBMISSION",
        contentType: "application/pdf",
        size: 25 * 1024 * 1024 + 1
      })
    );
    expectAppError(() =>
      validateUploadFile({
        intent: "MISSION_RESOURCE",
        contentType: "application/pdf",
        size: 50 * 1024 * 1024 + 1
      })
    );
  });

  it("generates scoped object keys without unsafe path segments", () => {
    expect(sanitizeFileName("../Final Paper!!.pdf")).toBe("Final-Paper.pdf");

    const avatarKey = createStorageKey({
      intent: "AVATAR",
      fileName: "../avatar.png",
      userId: "user_1"
    });
    const submissionKey = createStorageKey({
      intent: "SUBMISSION",
      fileName: "work sheet.pdf",
      userId: "student_1",
      activityId: "activity_1"
    });
    const resourceKey = createStorageKey({
      intent: "MISSION_RESOURCE",
      fileName: "slides.pptx",
      userId: "lecturer_1",
      activityId: "activity_1"
    });

    expect(avatarKey).toMatch(/^avatars\/user_1\/.+-avatar\.png$/);
    expect(submissionKey).toMatch(/^submissions\/activity_1\/student_1\/.+-work-sheet\.pdf$/);
    expect(resourceKey).toMatch(/^mission-resources\/activity_1\/.+-slides\.pptx$/);
    expect(avatarKey).not.toContain("..");
  });

  it("parses and rejects malformed storage references", () => {
    expect(parseStorageRef(toStorageRef("avatars/user_1/file.png"))).toBe(
      "avatars/user_1/file.png"
    );

    expectAppError(() => parseStorageRef("https://example.com/file.png"));
    expectAppError(() => parseStorageRef("s3:../file.png"));
    expectAppError(() => toStorageRef("../file.png"));
  });
});
