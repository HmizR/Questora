import { expect, test } from "@playwright/test";

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
