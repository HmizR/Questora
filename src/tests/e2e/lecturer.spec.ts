import { expect, test } from "@playwright/test";
import { ActivityResourceTextStatus, ActivityType, ClassStatus } from "@prisma/client";

import { e2eUsers, resetE2eDatabase, type E2eSeed } from "./fixtures";
import { loginAs } from "./helpers";
import { db } from "../../lib/db";

let seed: E2eSeed;

test.beforeEach(async () => {
  seed = await resetE2eDatabase();
});

test("lecturer can create a region and a mission in an assigned realm", async ({ page }) => {
  await loginAs(page, e2eUsers.lecturer.email);

  await page.goto(`/lecturer/classes/${seed.class.id}/modules/new`);
  await page.getByLabel("Region title").fill("E2E New Region");
  await page.getByLabel("Description").fill("Created by a browser workflow test.");
  await page.getByLabel("Position").fill("2");
  await page.getByLabel("Published").check();
  await page.getByRole("button", { name: "Create region" }).click();

  await expect(page).toHaveURL(`/lecturer/classes/${seed.class.id}/modules`);
  await expect(page.getByText("2. E2E New Region")).toBeVisible();

  await page.goto(`/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/new`);
  await page.getByLabel("Mission type").selectOption("ASSIGNMENT");
  await page.getByLabel("Mission title").fill("E2E New Mission");
  await page.getByLabel("Description").fill("A mission created through Playwright.");
  await page.getByLabel("Content or instructions").fill("Submit a concise answer.");
  await page.getByLabel("Position").fill("4");
  await page.getByLabel("Max score").fill("50");
  await page.getByLabel("Passing score").fill("30");
  await page.getByLabel("Published").check();
  await page.getByRole("button", { name: "Create mission" }).click();

  await expect(page).toHaveURL(`/lecturer/classes/${seed.class.id}/modules`);
  await expect(page.getByText("4. E2E New Mission")).toBeVisible();
});

test("lecturer publish actions show toast feedback", async ({ page }) => {
  const draftModule = await db.module.create({
    data: {
      classId: seed.class.id,
      title: "E2E Draft Region",
      description: "Draft region for toast feedback.",
      position: 2,
      isPublished: false
    }
  });

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(`/lecturer/classes/${seed.class.id}/modules`);

  await page.getByText(`2. ${draftModule.title}`).click();
  await page.getByLabel(`Actions for ${draftModule.title}`).click();
  await page.getByRole("button", { name: "Publish" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Region published." })).toBeVisible();
});

test("lecturer creates and publishes a class announcement for students", async ({ page }) => {
  await loginAs(page, e2eUsers.lecturer.email);

  await page.goto(`/lecturer/classes/${seed.class.id}/announcements/new`);
  await expect(page.getByRole("link", { name: "Announcements", exact: true })).toBeVisible();
  await page.getByLabel("Announcement title").fill("E2E Schedule Update");
  await page.getByLabel("Update").fill("Project work time has been added to this week's realm session.");
  await page.getByLabel("Status").selectOption("DRAFT");
  await page.getByRole("button", { name: "Create announcement" }).click();

  await expect(page).toHaveURL(`/lecturer/classes/${seed.class.id}/announcements`);
  await expect(page.getByText("E2E Schedule Update")).toBeVisible();
  await expect(page.getByText("Draft")).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Announcement published." })).toBeVisible();

  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/announcements`);
  await expect(page.getByRole("heading", { name: "Announcements" })).toBeVisible();
  await expect(page.getByText("E2E Schedule Update")).toBeVisible();
  await expect(page.getByText("Project work time has been added")).toBeVisible();

  await page.goto(`/student/classes/${seed.class.id}`);
  await expect(page.getByRole("heading", { name: "Recent announcements" })).toBeVisible();
  await expect(page.getByText("E2E Schedule Update")).toBeVisible();
});

test("lecturer opens quiz analytics from regions", async ({ page }) => {
  await db.quizAttempt.createMany({
    data: [
      {
        activityId: seed.activities.quiz.id,
        studentId: seed.users.student.id,
        attemptNo: 1,
        answers: {
          selected: { q1: 0 },
          results: [
            {
              questionId: "q1",
              selectedOptionIndex: 0,
              correctOptionIndex: 0,
              isCorrect: true,
              pointsAwarded: 10,
              pointsPossible: 10
            }
          ]
        },
        score: 10,
        maxScore: 10,
        passed: true
      },
      {
        activityId: seed.activities.quiz.id,
        studentId: seed.users.rival.id,
        attemptNo: 1,
        answers: {
          selected: { q1: 1 },
          results: [
            {
              questionId: "q1",
              selectedOptionIndex: 1,
              correctOptionIndex: 0,
              isCorrect: false,
              pointsAwarded: 0,
              pointsPossible: 10
            }
          ]
        },
        score: 0,
        maxScore: 10,
        passed: false
      }
    ]
  });

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(`/lecturer/classes/${seed.class.id}/modules`);
  await page.getByText("2. E2E Quiz").click();
  await page.getByRole("link", { name: "View quiz analytics" }).click();

  await expect(page.getByRole("heading", { name: "E2E Quiz analytics" })).toBeVisible();
  await expect(page.getByText("Students with at least one attempt")).toBeVisible();
  await expect(page.getByText("Total submitted quiz attempts")).toBeVisible();
  await expect(page.getByText("Question breakdown")).toBeVisible();
  await expect(page.getByText("Completion rate")).toBeVisible();
  await expect(page.getByText("50% correct")).toBeVisible();
  await expect(page.getByRole("row", { name: /E2E Student/ })).toContainText("Passed");
  await expect(page.getByRole("row", { name: /E2E Rival/ })).toContainText("Not passed");
});

test("lecturer filters analytics tables and downloads CSV exports", async ({ page }) => {
  await db.submission.create({
    data: {
      activityId: seed.activities.assignment.id,
      studentId: seed.users.student.id,
      textContent: "Needs grading",
      status: "SUBMITTED",
      submittedAt: new Date()
    }
  });
  await db.quizAttempt.create({
    data: {
      activityId: seed.activities.quiz.id,
      studentId: seed.users.rival.id,
      attemptNo: 1,
      answers: {
        selected: { q1: 1 },
        results: []
      },
      score: 0,
      maxScore: 10,
      passed: false
    }
  });

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(`/lecturer/classes/${seed.class.id}/students`);
  await page.getByLabel("Search students").fill("E2E Student");
  await page.getByLabel("Attention").selectOption("needs-attention");
  await page.getByLabel("Sort").selectOption("grades");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("row", { name: /E2E Student/ })).toContainText("Needs attention");
  await expect(page.getByRole("row", { name: /E2E Rival/ })).toHaveCount(0);

  await page.goto(`/lecturer/classes/${seed.class.id}/grades`);
  await page.getByLabel("Status").selectOption("ungraded");
  await page.getByLabel("Attention").selectOption("needs-attention");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("row", { name: /E2E Student/ })).toContainText("Ungraded");
  const gradesDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "CSV" }).click();
  await expect((await gradesDownload).suggestedFilename()).toBe("grades.csv");

  await page.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/${seed.activities.assignment.id}/submissions`
  );
  await page.getByLabel("Status").selectOption("ungraded");
  await page.getByLabel("Attention").selectOption("needs-attention");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.locator("span").filter({ hasText: "Needs attention" }).first()).toBeVisible();

  await page.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/${seed.activities.quiz.id}/quiz`
  );
  await page.getByLabel("Status").selectOption("not-passed");
  await page.getByLabel("Sort").selectOption("best");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("row", { name: /E2E Rival/ })).toContainText("Needs attention");
  const quizDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "CSV" }).click();
  await expect((await quizDownload).suggestedFilename()).toBe("quiz-analytics.csv");
});

test("lecturer uploads and removes a mission resource", async ({ page }) => {
  const longResourceFileName =
    "e2e-resource-pack-with-a-very-long-name-that-should-stay-inside-the-card.zip";

  await page.route("**/api/uploads/presign", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        uploadUrl: "https://uploads.questora.test/e2e-resource.zip",
        storageRef: `s3:mission-resources/${seed.activities.assignment.id}/e2e-resource.zip`,
        key: `mission-resources/${seed.activities.assignment.id}/e2e-resource.zip`,
        expiresIn: 300
      })
    });
  });
  await page.route("https://uploads.questora.test/e2e-resource.zip", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/${seed.activities.assignment.id}/edit`
  );

  const addResourceForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Add resource" })
  });
  await addResourceForm.getByLabel("Resource title").fill("E2E Resource Pack");
  await addResourceForm.getByLabel("Description").fill("Required starter files for the assignment.");
  await addResourceForm.getByLabel("Resource label").selectOption("STARTER_FILE");
  await addResourceForm.getByLabel("Position").fill("1");
  await addResourceForm.getByLabel("Required resource").check();
  await page.setInputFiles("#mission-resource-file", {
    name: longResourceFileName,
    mimeType: "application/zip",
    buffer: Buffer.from("E2E resource")
  });
  await expect(page.getByRole("status").filter({ hasText: "Resource uploaded." })).toBeVisible();
  await page.getByRole("button", { name: "Add resource" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Resource added." })).toBeVisible();
  await expect(page.getByText("E2E Resource Pack")).toBeVisible();
  await expect(page.getByTitle("Required starter files for the assignment.")).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "Starter file" }).first()).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "Required" }).first()).toBeVisible();
  await expect(page.getByText(longResourceFileName).first()).toBeVisible();
  await expect(page.getByText("Zip").first()).toBeVisible();
  await expect(page.getByText("12 B").first()).toBeVisible();
  await page.getByText("Edit details").click();
  const editDetails = page.locator("details").filter({ hasText: "Edit details" }).first();
  await editDetails.getByLabel("Resource title").fill("E2E Resource Pack Updated");
  await editDetails.getByLabel("Description").fill("Optional review packet after the workshop.");
  await editDetails.getByLabel("Resource label").selectOption("WORKSHEET");
  await editDetails.getByLabel("Required resource").uncheck();
  await editDetails.getByRole("button", { name: "Save resource details" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Resource details updated." })).toBeVisible();
  await expect(page.getByText("E2E Resource Pack Updated")).toBeVisible();
  await expect(page.getByTitle("Optional review packet after the workshop.")).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "Worksheet" }).first()).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "Optional" }).first()).toBeVisible();

  await page.goto(`/lecturer/classes/${seed.class.id}/modules`);
  await page.getByText("1. E2E Assignment").click();
  await expect(page.getByText("0 required / 1 resource")).toBeVisible();

  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}`);
  await expect(page.getByText("1 resource available")).toBeVisible();

  let downloadRequested = false;
  await page.route("**/api/uploads/download", async (route) => {
    downloadRequested = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        downloadUrl: "https://downloads.questora.test/e2e-resource.zip",
        expiresIn: 300
      })
    });
  });
  await page.getByRole("link", { name: /E2E Assignment/ }).click();
  await expect(page.getByRole("heading", { name: "Resources", exact: true })).toBeVisible();
  await expect(page.getByText("Optional resources")).toBeVisible();
  await expect(page.getByText("E2E Resource Pack Updated")).toBeVisible();
  await expect(page.getByTitle("Optional review packet after the workshop.")).toBeVisible();
  await expect(page.getByText(longResourceFileName).first()).toBeVisible();
  await expect(page.getByText("Zip").first()).toBeVisible();
  await expect(page.getByText("12 B").first()).toBeVisible();
  await page.getByRole("button", { name: "Open resource" }).click();
  await expect.poll(() => downloadRequested).toBe(true);

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/${seed.activities.assignment.id}/edit`
  );
  await page.getByRole("button", { name: "Remove resource" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove resource" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Resource removed." })).toBeVisible();
  await expect(page.getByText("E2E Resource Pack Updated")).toHaveCount(0);
});

test("lecturer sees mission resource extraction status", async ({ page }) => {
  await db.activityResource.create({
    data: {
      activityId: seed.activities.assignment.id,
      title: "Ready Text Resource",
      fileName: "ready-notes.md",
      fileUrl: `s3:mission-resources/${seed.activities.assignment.id}/ready-notes.md`,
      contentType: "text/markdown",
      size: 1200,
      position: 1,
      createdById: seed.users.lecturer.id,
      textStatus: ActivityResourceTextStatus.READY,
      textExtractedAt: new Date(),
      extractedTexts: {
        create: {
          chunkIndex: 0,
          content: "Mission resource text is available to the assistant."
        }
      }
    }
  });
  await db.activityResource.create({
    data: {
      activityId: seed.activities.assignment.id,
      title: "Unsupported Archive",
      fileName: "archive.zip",
      fileUrl: `s3:mission-resources/${seed.activities.assignment.id}/archive.zip`,
      contentType: "application/zip",
      size: 2400,
      position: 2,
      createdById: seed.users.lecturer.id,
      textStatus: ActivityResourceTextStatus.UNSUPPORTED
    }
  });
  await db.activityResource.create({
    data: {
      activityId: seed.activities.assignment.id,
      title: "Failed Extraction",
      fileName: "failed.txt",
      fileUrl: `s3:mission-resources/${seed.activities.assignment.id}/failed.txt`,
      contentType: "text/plain",
      size: 800,
      position: 3,
      createdById: seed.users.lecturer.id,
      textStatus: ActivityResourceTextStatus.FAILED,
      textError: "Temporary extraction failure"
    }
  });

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/${seed.activities.assignment.id}/edit`
  );

  await expect(page.getByText("Ready Text Resource")).toBeVisible();
  await expect(page.getByText("Text ready")).toBeVisible();
  await expect(page.getByText("Unsupported Archive")).toBeVisible();
  await expect(page.getByText("Unsupported", { exact: true })).toBeVisible();
  await expect(page.getByText("Failed Extraction")).toBeVisible();
  await expect(page.getByText("Extraction failed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry extraction" })).toBeVisible();
  await page.getByRole("button", { name: "Clear extracted text" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Clear extracted text" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Extracted text cleared." })).toBeVisible();
  await expect(page.getByText("Not extracted")).toBeVisible();
});

test("lecturer mission deletion requires confirmation", async ({ page }) => {
  const disposableMission = await db.activity.create({
    data: {
      moduleId: seed.module.id,
      type: ActivityType.LESSON,
      title: "E2E Disposable Mission",
      content: "Temporary mission for deletion safety.",
      position: 4,
      isRequired: true,
      isPublished: true
    }
  });

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(`/lecturer/classes/${seed.class.id}/modules`);
  await page.getByText("4. E2E Disposable Mission").click();
  await page.getByLabel("Actions for E2E Disposable Mission").click();
  await page.getByRole("button", { name: "Delete mission" }).click();
  await expect(page.getByRole("dialog")).toContainText("Delete this mission?");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("4. E2E Disposable Mission")).toBeVisible();
  await expect(await db.activity.findUnique({ where: { id: disposableMission.id } })).not.toBeNull();

  await page.reload();
  await page.getByText("4. E2E Disposable Mission").click();
  await page.getByLabel("Actions for E2E Disposable Mission").click();
  await expect(page.getByRole("button", { name: "Delete mission" })).toBeVisible();
  await page.getByRole("button", { name: "Delete mission" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete mission" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Mission deleted." })).toBeVisible();
  await expect(page.getByText("4. E2E Disposable Mission")).toHaveCount(0);
  await expect(await db.activity.findUnique({ where: { id: disposableMission.id } })).toBeNull();
});

test("lecturer sees an empty state when a realm has no regions", async ({ page }) => {
  const emptyClass = await db.class.create({
    data: {
      name: "E2E Empty Realm",
      code: "E2E-EMPTY",
      lecturerId: seed.users.lecturer.id,
      createdById: seed.users.admin.id,
      status: ClassStatus.ACTIVE
    }
  });

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(`/lecturer/classes/${emptyClass.id}/modules`);

  await expect(page.getByRole("heading", { name: "No regions yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New region" }).last()).toBeVisible();
});
