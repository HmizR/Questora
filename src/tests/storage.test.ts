import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { canPreviewFile, formatFileSize, getFileKind, getPreviewKind } from "@/lib/file-display";
import {
  createStorageKey,
  parseStorageRef,
  sanitizeFileName,
  toStorageRef,
  validateUploadFile
} from "@/lib/storage";
import { isProtectedStorageRef } from "@/lib/upload-rules";

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
  it("formats file labels for mission resources", () => {
    expect(getFileKind("application/pdf", "briefing.bin")).toBe("PDF");
    expect(
      getFileKind(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "slides.bin"
      )
    ).toBe("Slides");
    expect(getFileKind("", "report.docx")).toBe("Document");
    expect(getFileKind("image/png", "map.png")).toBe("Image");
    expect(getFileKind("application/zip", "assets.zip")).toBe("Zip");
    expect(getFileKind("application/octet-stream", "unknown.bin")).toBe("File");

    expect(formatFileSize(0)).toBe("Unknown size");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
  });

  it("detects inline preview support for mission resources", () => {
    expect(getPreviewKind("application/pdf", "briefing.bin")).toBe("PDF");
    expect(getPreviewKind("", "briefing.pdf")).toBe("PDF");
    expect(getPreviewKind("image/png", "map.bin")).toBe("IMAGE");
    expect(getPreviewKind("", "map.webp")).toBe("IMAGE");
    expect(getPreviewKind("text/plain", "notes.bin")).toBe("TEXT");
    expect(getPreviewKind("", "guide.md")).toBe("TEXT");
    expect(getPreviewKind("application/zip", "assets.zip")).toBe("UNSUPPORTED");
    expect(getPreviewKind("", "slides.pptx")).toBe("UNSUPPORTED");
    expect(canPreviewFile("application/pdf", "briefing.pdf")).toBe(true);
    expect(canPreviewFile("application/zip", "assets.zip")).toBe(false);
  });

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
    expect(isProtectedStorageRef("s3:avatars/user_1/file.png")).toBe(true);
    expect(isProtectedStorageRef("https://example.com/file.png")).toBe(false);

    expectAppError(() => parseStorageRef("https://example.com/file.png"));
    expectAppError(() => parseStorageRef("s3:../file.png"));
    expectAppError(() => toStorageRef("../file.png"));
  });
});
