import { expect, test } from "@playwright/test";
import { ActivityType, ClassStatus } from "@prisma/client";

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
  await expect(page.getByText("Question breakdown")).toBeVisible();
  await expect(page.getByText("50% correct")).toBeVisible();
  await expect(page.getByRole("row", { name: /E2E Student/ })).toContainText("Passed");
  await expect(page.getByRole("row", { name: /E2E Rival/ })).toContainText("Not passed");
});

test("lecturer uploads and removes a mission resource", async ({ page }) => {
  await page.route("**/api/uploads/presign", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        uploadUrl: "https://uploads.questora.test/e2e-resource.pdf",
        storageRef: `s3:mission-resources/${seed.activities.assignment.id}/e2e-resource.pdf`,
        key: `mission-resources/${seed.activities.assignment.id}/e2e-resource.pdf`,
        expiresIn: 300
      })
    });
  });
  await page.route("https://uploads.questora.test/e2e-resource.pdf", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/${seed.activities.assignment.id}/edit`
  );

  await page.getByLabel("Resource title").fill("E2E Resource Pack");
  await page.getByLabel("Position").last().fill("1");
  await page.setInputFiles("#mission-resource-file", {
    name: "e2e-resource.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("E2E resource")
  });
  await expect(page.getByRole("status").filter({ hasText: "Resource uploaded." })).toBeVisible();
  await page.getByRole("button", { name: "Add resource" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Resource added." })).toBeVisible();
  await expect(page.getByText("E2E Resource Pack")).toBeVisible();

  await page.goto(`/lecturer/classes/${seed.class.id}/modules`);
  await page.getByText("1. E2E Assignment").click();
  await expect(page.getByText("1 resource")).toBeVisible();

  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}`);
  await expect(page.getByText("1 resource available")).toBeVisible();

  let downloadRequested = false;
  await page.route("**/api/uploads/download", async (route) => {
    downloadRequested = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        downloadUrl: "https://downloads.questora.test/e2e-resource.pdf",
        expiresIn: 300
      })
    });
  });
  await page.getByRole("link", { name: /E2E Assignment/ }).click();
  await expect(page.getByRole("heading", { name: "Resources" })).toBeVisible();
  await expect(page.getByText("E2E Resource Pack")).toBeVisible();
  await page.getByRole("button", { name: "Open resource" }).click();
  await expect.poll(() => downloadRequested).toBe(true);

  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/${seed.activities.assignment.id}/edit`
  );
  await page.getByRole("button", { name: "Remove resource" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove resource" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Resource removed." })).toBeVisible();
  await expect(page.getByText("E2E Resource Pack")).toHaveCount(0);
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
