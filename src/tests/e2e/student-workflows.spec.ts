import { expect, test } from "@playwright/test";

import { e2eUsers, resetE2eDatabase, type E2eSeed } from "./fixtures";
import { loginAs } from "./helpers";

let seed: E2eSeed;

test.beforeEach(async () => {
  seed = await resetE2eDatabase();
});

test("student submission can be graded and then locks on the student activity page", async ({
  browser,
  page
}) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.assignment.id}`);
  await page.getByLabel("Submission text").fill("This is my e2e assignment answer.");
  await page.getByLabel("File URL").fill("https://example.com/e2e-submission");
  await page.getByRole("button", { name: "Submit assignment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Submission sent." })).toBeVisible();

  const lecturerContext = await browser.newContext();
  const lecturerPage = await lecturerContext.newPage();
  await loginAs(lecturerPage, e2eUsers.lecturer.email);
  await lecturerPage.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/` +
      `${seed.activities.assignment.id}/submissions?studentId=${seed.users.student.id}`
  );
  await expect(lecturerPage.getByText("This is my e2e assignment answer.")).toBeVisible();
  await lecturerPage.getByLabel("Score").fill("88");
  await lecturerPage.getByLabel("Feedback").fill("Solid work from the e2e flow.");
  await lecturerPage.getByRole("button", { name: "Grade" }).click();
  await expect(lecturerPage.getByRole("button", { name: "Publish grade" })).toBeVisible();
  await lecturerPage.getByRole("button", { name: "Publish grade" }).click();
  await expect(lecturerPage.getByText("88 published")).toBeVisible();
  await lecturerContext.close();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Submission locked" })).toBeVisible();
  await expect(page.getByText("This work has been graded and can no longer be edited.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit assignment" })).toHaveCount(0);

  await page.goto(`/student/classes/${seed.class.id}/grades`);
  await expect(page.getByRole("heading", { name: "E2E Realm grades" })).toBeVisible();
  await expect(page.getByRole("row", { name: /E2E Assignment/ })).toContainText("88 / 100");
  await expect(page.getByRole("row", { name: /E2E Assignment/ })).toContainText(
    "Solid work from the e2e flow."
  );
});

test("student quiz attempt limit hides questions after attempts are exhausted", async ({ page }) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.quiz.id}`);

  await expect(page.getByText("Questora is a learning realm.")).toBeVisible();
  await page.getByLabel("True").check();
  await page.getByRole("button", { name: "Submit quiz attempt" }).click();

  await expect(page.getByText("You have used all attempts for this quiz.")).toBeVisible();
  await expect(page.getByText("Questora is a learning realm.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit quiz attempt" })).toHaveCount(0);
});

test("leaderboard names link to public student profiles", async ({ page }) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto("/student/leaderboard");

  await page.getByRole("link", { name: e2eUsers.rival.name }).click();
  await expect(page).toHaveURL(/\/student\/profiles\//);
  await expect(page.getByRole("heading", { name: "E2E Rival's profile" })).toBeVisible();

  await page.goto(`/student/classes/${seed.class.id}/leaderboard`);
  await page.getByRole("link", { name: e2eUsers.student.name }).click();
  await expect(page).toHaveURL(/\/student\/profiles\//);
  await expect(page.getByRole("heading", { name: "E2E Student's profile" })).toBeVisible();
});
