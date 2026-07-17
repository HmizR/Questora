import { expect, test, type Page } from "@playwright/test";

import { e2eUsers, resetE2eDatabase, type E2eSeed } from "./fixtures";
import { loginAs } from "./helpers";

let seed: E2eSeed;

test.beforeEach(async () => {
  seed = await resetE2eDatabase();
});

async function mockSubmissionUpload(page: Page) {
  await page.route("**/api/uploads/presign", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        uploadUrl: "https://uploads.questora.test/e2e-submission.pdf",
        storageRef: `s3:submissions/${seed.activities.assignment.id}/${seed.users.student.id}/e2e-submission.pdf`,
        key: `submissions/${seed.activities.assignment.id}/${seed.users.student.id}/e2e-submission.pdf`,
        expiresIn: 300
      })
    });
  });
  await page.route("https://uploads.questora.test/e2e-submission.pdf", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });
}

async function mockSubmissionDownload(page: Page) {
  await page.route("**/api/uploads/download", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        downloadUrl: "https://downloads.questora.test/e2e-submission.pdf",
        expiresIn: 300
      })
    });
  });
}

test("student submission can be graded and then locks on the student activity page", async ({
  browser,
  page
}) => {
  await mockSubmissionUpload(page);
  await mockSubmissionDownload(page);
  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.assignment.id}`);
  await page.getByLabel("Submission text").fill("This is my e2e assignment answer.");
  await page.setInputFiles("#submission-file", {
    name: "e2e-submission.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("E2E submission file")
  });
  await expect(page.getByRole("status").filter({ hasText: "File uploaded." })).toBeVisible();
  await expect(page.getByText("e2e-submission.pdf (protected)")).toBeVisible();
  await page.getByRole("button", { name: "Submit assignment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Submission sent." })).toBeVisible();
  await expect(page.getByText("Submitted").first()).toBeVisible();
  await expect(page.getByText("Editable until graded")).toBeVisible();

  const lecturerContext = await browser.newContext();
  const lecturerPage = await lecturerContext.newPage();
  await mockSubmissionDownload(lecturerPage);
  await loginAs(lecturerPage, e2eUsers.lecturer.email);
  await lecturerPage.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/` +
      `${seed.activities.assignment.id}/submissions?studentId=${seed.users.student.id}`
  );
  await expect(lecturerPage.getByText("This is my e2e assignment answer.")).toBeVisible();
  await expect(lecturerPage.getByText("Submitted").first()).toBeVisible();
  await expect(lecturerPage.getByText("Ungraded").first()).toBeVisible();
  await expect(lecturerPage.getByRole("button", { name: "Open submitted file" })).toBeVisible();
  await lecturerPage.getByLabel("Score").fill("88");
  await lecturerPage.getByLabel("Feedback").fill("Solid work from the e2e flow.");
  await lecturerPage.getByRole("button", { name: "Grade" }).click();
  await expect(lecturerPage.getByRole("button", { name: "Publish grade" })).toBeVisible();
  await expect(lecturerPage.getByText("Draft grade").first()).toBeVisible();
  await lecturerPage.getByRole("button", { name: "Publish grade" }).click();
  await expect(lecturerPage.getByText("Published").first()).toBeVisible();
  await expect(lecturerPage.getByText("Score 88").first()).toBeVisible();
  await lecturerContext.close();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Submission locked" })).toBeVisible();
  await expect(page.getByText("Graded").first()).toBeVisible();
  await expect(page.getByText("This work has been graded and can no longer be edited.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open submitted file" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit assignment" })).toHaveCount(0);

  await page.goto(`/student/classes/${seed.class.id}/grades`);
  await expect(page.getByRole("heading", { name: "E2E Realm grades" })).toBeVisible();
  await expect(page.getByRole("row", { name: /E2E Assignment/ })).toContainText("88 / 100");
  await expect(page.getByRole("row", { name: /E2E Assignment/ })).toContainText("Published");
  await expect(page.getByRole("row", { name: /E2E Assignment/ })).toContainText(
    "Solid work from the e2e flow."
  );
});

test("student can still submit an assignment with a pasted file URL", async ({ page }) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.assignment.id}`);

  await page.getByLabel("File URL").fill("https://example.com/e2e-submission");
  await page.getByRole("button", { name: "Submit assignment" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Submission sent." })).toBeVisible();
});

test("student quiz attempt limit hides questions after attempts are exhausted", async ({ page }) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.quiz.id}`);

  await expect(page.getByText("Questora is a learning realm.")).toBeVisible();
  await page.getByLabel("True").check();
  await page.getByRole("button", { name: "Submit quiz attempt" }).click();

  await expect(page.getByText("You have used all attempts for this quiz.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "True" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit quiz attempt" })).toHaveCount(0);
});

test("student quiz review hides correct answers until attempts are exhausted", async ({ page }) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.reviewQuiz.id}`);

  await page.getByLabel("False").check();
  await page.getByRole("button", { name: "Submit quiz attempt" }).click();
  await page.getByText("Review attempt 1").click();
  await expect(page.getByText("Correct answer hidden while attempts remain.")).toBeVisible();
  await expect(page.getByText("Correct answer: True")).toHaveCount(0);

  await page.getByLabel("False").check();
  await page.getByRole("button", { name: "Submit quiz attempt" }).click();
  await expect(page.getByText("You have used all attempts for this quiz.")).toBeVisible();
  await page.getByText("Review attempt 2").click();
  await expect(page.getByText("Correct answer: True").first()).toBeVisible();
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
