import { describe, expect, it, vi } from "vitest";

import {
  isManagedStorageKey,
  parseManagedStorageRef,
  type StorageObjectSummary
} from "@/lib/storage";
import {
  collectManagedStorageKeys,
  runStorageCleanup,
  selectStorageCleanupCandidates
} from "@/services/storage-cleanup-service";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(async () => [])
    },
    submission: {
      findMany: vi.fn(async () => [])
    },
    activityResource: {
      findMany: vi.fn(async () => [])
    }
  }
}));

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");

  return {
    ...actual,
    listStorageObjects: vi.fn(async () => []),
    deleteStorageObject: vi.fn(async () => undefined)
  };
});

import { deleteStorageObject, listStorageObjects } from "@/lib/storage";

const listStorageObjectsMock = vi.mocked(listStorageObjects);
const deleteStorageObjectMock = vi.mocked(deleteStorageObject);

function object(key: string, lastModified: Date): StorageObjectSummary {
  return {
    key,
    size: 100,
    lastModified
  };
}

describe("storage cleanup helpers", () => {
  it("accepts only Questora-managed storage prefixes", () => {
    expect(isManagedStorageKey("avatars/user/avatar.png")).toBe(true);
    expect(isManagedStorageKey("submissions/activity/student/file.pdf")).toBe(true);
    expect(isManagedStorageKey("mission-resources/activity/slides.pdf")).toBe(true);
    expect(isManagedStorageKey("tmp/upload.pdf")).toBe(false);

    expect(parseManagedStorageRef("s3:avatars/user/avatar.png")).toBe("avatars/user/avatar.png");
    expect(() => parseManagedStorageRef("s3:tmp/upload.pdf")).toThrow();
  });

  it("collects referenced managed keys and ignores URLs or malformed refs", () => {
    const keys = collectManagedStorageKeys([
      "https://example.com/avatar.png",
      "s3:avatars/user/avatar.png",
      "s3:mission-resources/activity/slides.pdf",
      "s3:tmp/upload.pdf",
      "s3:../bad.pdf",
      null
    ]);

    expect([...keys]).toEqual([
      "avatars/user/avatar.png",
      "mission-resources/activity/slides.pdf"
    ]);
  });

  it("selects only old unreferenced managed objects as cleanup candidates", () => {
    const now = new Date("2026-07-23T12:00:00.000Z");
    const old = new Date("2026-07-19T12:00:00.000Z");
    const recent = new Date("2026-07-23T10:00:00.000Z");
    const referencedKeys = new Set(["avatars/user/used.png"]);
    const result = selectStorageCleanupCandidates({
      now,
      safetyHours: 72,
      referencedKeys,
      objects: [
        object("avatars/user/used.png", old),
        object("avatars/user/orphan.png", old),
        object("submissions/activity/student/recent.pdf", recent),
        object("tmp/outside.pdf", old)
      ]
    });

    expect(result.candidates.map((candidate) => candidate.key)).toEqual(["avatars/user/orphan.png"]);
    expect(result.skippedRecent).toBe(1);
  });

  it("dry-run cleanup never deletes objects", async () => {
    const old = new Date(Date.now() - 100 * 60 * 60 * 1000);
    listStorageObjectsMock.mockImplementation(async (prefix) =>
      prefix === "avatars/" ? [object("avatars/user/orphan.png", old)] : []
    );

    const result = await runStorageCleanup({ dryRun: true, safetyHours: 72 });

    expect(result.orphanCandidates).toBe(1);
    expect(result.deleted).toBe(0);
    expect(deleteStorageObjectMock).not.toHaveBeenCalled();
  });

  it("delete cleanup removes only eligible candidates", async () => {
    const old = new Date(Date.now() - 100 * 60 * 60 * 1000);
    listStorageObjectsMock.mockImplementation(async (prefix) =>
      prefix === "avatars/" ? [object("avatars/user/orphan.png", old)] : []
    );

    const result = await runStorageCleanup({ dryRun: false, safetyHours: 72 });

    expect(result.deleted).toBe(1);
    expect(deleteStorageObjectMock).toHaveBeenCalledWith("avatars/user/orphan.png");
  });
});
