import { AnnouncementStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  isAnnouncementVisibleToStudent,
  nextAnnouncementPublishedAt
} from "@/lib/announcement-rules";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema
} from "@/schemas/lecturer";

describe("announcement rules", () => {
  it("requires a title and body", () => {
    expect(createAnnouncementSchema.safeParse({ classId: "class-1", title: "", body: "" }).success).toBe(false);
    expect(
      updateAnnouncementSchema.safeParse({
        classId: "class-1",
        announcementId: "announcement-1",
        title: "Office hours",
        body: "Bring your project questions.",
        status: AnnouncementStatus.DRAFT
      }).success
    ).toBe(true);
  });

  it("sets publishedAt only when publishing", () => {
    const now = new Date("2026-07-21T10:00:00.000Z");
    expect(nextAnnouncementPublishedAt({ status: AnnouncementStatus.DRAFT, now })).toBeNull();
    expect(nextAnnouncementPublishedAt({ status: AnnouncementStatus.ARCHIVED, now })).toBeNull();
    expect(nextAnnouncementPublishedAt({ status: AnnouncementStatus.PUBLISHED, now })).toEqual(now);
  });

  it("keeps an existing publishedAt timestamp when republishing", () => {
    const previousPublishedAt = new Date("2026-07-01T10:00:00.000Z");

    expect(
      nextAnnouncementPublishedAt({
        status: AnnouncementStatus.PUBLISHED,
        previousPublishedAt,
        now: new Date("2026-07-21T10:00:00.000Z")
      })
    ).toEqual(previousPublishedAt);
  });

  it("shows only published announcements to students", () => {
    expect(isAnnouncementVisibleToStudent(AnnouncementStatus.PUBLISHED)).toBe(true);
    expect(isAnnouncementVisibleToStudent(AnnouncementStatus.DRAFT)).toBe(false);
    expect(isAnnouncementVisibleToStudent(AnnouncementStatus.ARCHIVED)).toBe(false);
  });
});
