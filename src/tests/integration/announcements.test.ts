import { AnnouncementStatus, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  getPublishedAnnouncementsForStudent,
  publishAnnouncement,
  updateAnnouncement
} from "@/services/announcement-service";

import {
  createClassFixture,
  createUser,
  enrollStudentFixture
} from "./fixtures";

describe("database-backed announcement rules", () => {
  it("allows a lecturer to create, update, publish, archive, and delete own announcements", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();

    const announcement = await createAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      title: "Draft update",
      body: "Bring questions to the next session.",
      status: AnnouncementStatus.DRAFT
    });

    expect(announcement.status).toBe(AnnouncementStatus.DRAFT);
    expect(announcement.publishedAt).toBeNull();

    const updated = await updateAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      announcementId: announcement.id,
      title: "Updated draft",
      body: "Bring project questions to the next session.",
      status: AnnouncementStatus.DRAFT
    });
    expect(updated.title).toBe("Updated draft");

    const published = await publishAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      announcementId: announcement.id
    });
    expect(published.status).toBe(AnnouncementStatus.PUBLISHED);
    expect(published.publishedAt).not.toBeNull();

    const archived = await archiveAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      announcementId: announcement.id
    });
    expect(archived.status).toBe(AnnouncementStatus.ARCHIVED);
    expect(archived.publishedAt).toEqual(published.publishedAt);

    await deleteAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      announcementId: announcement.id
    });

    await expect(db.announcement.findUnique({ where: { id: announcement.id } })).resolves.toBeNull();
  });

  it("blocks lecturers from managing another lecturer's announcements", async () => {
    const outsider = await createUser(UserRole.LECTURER, "Outside Lecturer");
    const { lecturer, class: teachingClass } = await createClassFixture();
    const announcement = await createAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      title: "Owned announcement",
      body: "Only the assigned lecturer can manage this.",
      status: AnnouncementStatus.DRAFT
    });

    await expect(
      updateAnnouncement({
        lecturerId: outsider.id,
        classId: teachingClass.id,
        announcementId: announcement.id,
        title: "Hijacked",
        body: "Nope.",
        status: AnnouncementStatus.PUBLISHED
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      publishAnnouncement({
        lecturerId: outsider.id,
        classId: teachingClass.id,
        announcementId: announcement.id
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("shows students only published announcements for enrolled classes", async () => {
    const { lecturer, class: teachingClass } = await createClassFixture();
    const { student } = await enrollStudentFixture(teachingClass.id);
    const outsider = await createUser(UserRole.STUDENT, "Announcement Outsider");

    await createAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      title: "Draft update",
      body: "Students should not see this yet.",
      status: AnnouncementStatus.DRAFT
    });
    await createAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      title: "Published update",
      body: "Students should see this.",
      status: AnnouncementStatus.PUBLISHED
    });
    const archived = await createAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      title: "Archived update",
      body: "Students should not see this anymore.",
      status: AnnouncementStatus.PUBLISHED
    });
    await archiveAnnouncement({
      lecturerId: lecturer.id,
      classId: teachingClass.id,
      announcementId: archived.id
    });

    await expect(
      getPublishedAnnouncementsForStudent({ studentId: outsider.id, classId: teachingClass.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const visible = await getPublishedAnnouncementsForStudent({
      studentId: student.id,
      classId: teachingClass.id
    });

    expect(visible.map((announcement) => announcement.title)).toEqual(["Published update"]);
  });
});
