import { ActivityResourceKind, ActivityResourceTextStatus, ActivityType, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");

  return {
    ...actual,
    downloadStorageObject: vi.fn()
  };
});

import { downloadStorageObject } from "@/lib/storage";
import { db } from "@/lib/db";
import { createActivityResource } from "@/services/lecturer-service";
import { retryActivityResourceExtraction } from "@/services/resource-text-service";

import {
  createActivityFixture,
  createClassFixture,
  createModuleFixture,
  createUser
} from "./fixtures";

const downloadStorageObjectMock = vi.mocked(downloadStorageObject);

async function createResourceFixture(params?: {
  contentType?: string;
  fileName?: string;
  fileUrl?: string;
}) {
  const { lecturer, class: teachingClass } = await createClassFixture();
  const learningModule = await createModuleFixture(teachingClass.id);
  const activity = await createActivityFixture(learningModule.id, {
    type: ActivityType.ASSIGNMENT
  });

  const resource = await createActivityResource({
    lecturerId: lecturer.id,
    activityId: activity.id,
    title: "Extractable Resource",
    description: "A resource used for extraction tests.",
    kind: ActivityResourceKind.READING,
    isRequired: true,
    fileName: params?.fileName ?? "notes.txt",
    fileUrl: params?.fileUrl ?? `s3:mission-resources/${activity.id}/notes.txt`,
    contentType: params?.contentType ?? "text/plain",
    size: 120,
    position: 1
  });

  return { lecturer, activity, resource };
}

describe("resource text extraction services", () => {
  beforeEach(() => {
    downloadStorageObjectMock.mockReset();
  });

  it("stores extracted chunks and marks supported protected text resources ready", async () => {
    downloadStorageObjectMock.mockResolvedValue(
      Buffer.from("Alpha mission guidance.\n\nBeta mission evidence.", "utf8")
    );

    const { resource } = await createResourceFixture();
    const storedResource = await db.activityResource.findUniqueOrThrow({
      where: { id: resource.id },
      include: { extractedTexts: { orderBy: { chunkIndex: "asc" } } }
    });

    expect(storedResource.textStatus).toBe(ActivityResourceTextStatus.READY);
    expect(storedResource.textExtractedAt).toBeInstanceOf(Date);
    expect(storedResource.textError).toBeNull();
    expect(storedResource.extractedTexts.length).toBeGreaterThan(0);
    expect(storedResource.extractedTexts.map((chunk) => chunk.content).join(" ")).toContain(
      "Alpha mission guidance."
    );
  });

  it("marks unsupported resources without attempting object download", async () => {
    const { resource } = await createResourceFixture({
      contentType: "application/zip",
      fileName: "starter.zip",
      fileUrl: "s3:mission-resources/example/starter.zip"
    });
    const storedResource = await db.activityResource.findUniqueOrThrow({
      where: { id: resource.id },
      include: { extractedTexts: true }
    });

    expect(storedResource.textStatus).toBe(ActivityResourceTextStatus.UNSUPPORTED);
    expect(storedResource.extractedTexts).toEqual([]);
    expect(downloadStorageObjectMock).not.toHaveBeenCalled();
  });

  it("marks extraction failure without blocking resource creation", async () => {
    downloadStorageObjectMock.mockRejectedValue(new Error("Object store refused the request"));

    const { resource } = await createResourceFixture();
    const storedResource = await db.activityResource.findUniqueOrThrow({
      where: { id: resource.id },
      include: { extractedTexts: true }
    });

    expect(storedResource.textStatus).toBe(ActivityResourceTextStatus.FAILED);
    expect(storedResource.textError).toContain("Object store refused");
    expect(storedResource.extractedTexts).toEqual([]);
  });

  it("allows retry only for the lecturer who owns the mission resource", async () => {
    downloadStorageObjectMock.mockRejectedValueOnce(new Error("Temporary failure"));
    const { lecturer, activity, resource } = await createResourceFixture();
    const otherLecturer = await createUser(UserRole.LECTURER, "Other Resource Owner");

    await expect(
      retryActivityResourceExtraction({
        lecturerId: otherLecturer.id,
        activityId: activity.id,
        resourceId: resource.id
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    downloadStorageObjectMock.mockResolvedValueOnce(Buffer.from("Recovered text content.", "utf8"));

    await retryActivityResourceExtraction({
      lecturerId: lecturer.id,
      activityId: activity.id,
      resourceId: resource.id
    });

    const storedResource = await db.activityResource.findUniqueOrThrow({
      where: { id: resource.id },
      include: { extractedTexts: true }
    });

    expect(storedResource.textStatus).toBe(ActivityResourceTextStatus.READY);
    expect(storedResource.extractedTexts.map((chunk) => chunk.content).join(" ")).toContain(
      "Recovered text content."
    );
  });
});
