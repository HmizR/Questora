import { expect, test, type Page } from "@playwright/test";

import { e2eUsers, resetE2eDatabase, type E2eSeed } from "./fixtures";
import { loginAs, logout } from "./helpers";
import { db } from "../../lib/db";

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
  test.setTimeout(120_000);

  await mockSubmissionUpload(page);
  await mockSubmissionDownload(page);
  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.assignment.id}`);
  await expect(page.getByRole("heading", { name: "Instructions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your work" })).toBeVisible();
  await expect(page.getByText("Not submitted")).toBeVisible();
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
  await expect(page.getByText("Editable until graded", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Update submission" })).toBeVisible();

  const lecturerContext = await browser.newContext();
  const lecturerPage = await lecturerContext.newPage();
  await mockSubmissionDownload(lecturerPage);
  await loginAs(lecturerPage, e2eUsers.lecturer.email);
  await lecturerPage.goto(
    `/lecturer/classes/${seed.class.id}/modules/${seed.module.id}/activities/` +
      `${seed.activities.assignment.id}/submissions?studentId=${seed.users.student.id}`
  );
  await expect(lecturerPage.getByText("This is my e2e assignment answer.")).toBeVisible();
  await expect(lecturerPage.locator("span").filter({ hasText: "Not submitted" }).first()).toBeVisible();
  await expect(lecturerPage.getByText("Submission timeline")).toBeVisible();
  await expect(lecturerPage.locator("span").filter({ hasText: "Submitted" }).first()).toBeVisible();
  await expect(lecturerPage.locator("span").filter({ hasText: "Ungraded" }).first()).toBeVisible();
  await expect(lecturerPage.getByRole("button", { name: "Open submitted file" })).toBeVisible();
  await lecturerPage.getByRole("spinbutton", { name: "Score" }).fill("88");
  await lecturerPage.getByLabel("Feedback").fill("Solid work from the e2e flow.");
  await lecturerPage.getByRole("button", { name: "Grade" }).click();
  await expect(lecturerPage.getByRole("button", { name: "Publish grade" })).toBeVisible();
  await expect(lecturerPage.locator("span").filter({ hasText: "Draft grade" }).first()).toBeVisible();
  await lecturerPage.getByRole("button", { name: "Publish grade" }).click();
  await expect(lecturerPage.locator("span").filter({ hasText: "Published" }).first()).toBeVisible();
  await expect(lecturerPage.getByText("Score 88").first()).toBeVisible();
  await lecturerContext.close();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Your work" })).toBeVisible();
  await expect(page.getByText("Graded, locked").first()).toBeVisible();
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

test("student and lecturer dashboards show deadline panels", async ({ page }) => {
  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 2);
  const overdue = new Date(now);
  overdue.setDate(overdue.getDate() - 2);
  await db.activity.update({
    where: { id: seed.activities.assignment.id },
    data: { dueAt: dueSoon }
  });
  await db.activity.update({
    where: { id: seed.activities.quiz.id },
    data: { dueAt: overdue }
  });

  await loginAs(page, e2eUsers.student.email);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Due soon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Overdue" })).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E Assignment/ }).first()).toContainText("Due soon");
  await expect(page.getByRole("link", { name: /E2E Quiz/ })).toContainText("Overdue");

  await page.goto(`/student/classes/${seed.class.id}`);
  await expect(page.getByRole("heading", { name: "Upcoming deadlines" })).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E Assignment/ }).first()).toContainText("Due soon");
  await expect(page.getByText("Due:").first()).toBeVisible();

  await logout(page);
  await loginAs(page, e2eUsers.lecturer.email);
  await page.goto("/lecturer");
  await expect(page.getByRole("heading", { name: "Upcoming deadlines" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Overdue work" })).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E Assignment/ }).first()).toContainText("Due soon");
  await expect(page.getByRole("link", { name: /E2E Quiz/ }).first()).toContainText("Quiz not passed");

  await page.goto(`/lecturer/classes/${seed.class.id}`);
  await expect(page.getByRole("heading", { name: "Upcoming deadlines" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Overdue work" })).toBeVisible();
  await page.getByRole("link", { name: /E2E Quiz/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/lecturer/classes/${seed.class.id}/modules/.+/quiz`));
});

test("student quiz attempt limit hides questions after attempts are exhausted", async ({ page }) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.quiz.id}`);

  await expect(page.getByText("0 / 1 attempts used (1 remaining)")).toBeVisible();
  await expect(page.getByText("Questora is a learning realm.")).toBeVisible();
  await page.getByLabel("True").check();
  await page.getByRole("button", { name: "Submit quiz attempt" }).click();

  await expect(page.getByText("You have used all attempts for this quiz.")).toBeVisible();
  await expect(page.getByText("1 / 1 attempts used (0 remaining)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quiz review" })).toBeVisible();
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

test("global AI assistant drawer uses student page context", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/ai/chat/stream", async (route) => {
    requests += 1;
    const body = route.request().postDataJSON() as {
      context?: { type?: string };
      message?: string;
    };
    const contextLabel =
      body.context?.type === "STUDENT_ACTIVITY"
        ? "Using current mission"
        : body.context?.type === "STUDENT_CLASS"
          ? "Using current realm"
          : "General help";

    await route.fulfill({
      contentType: "text/event-stream",
      body: [
        `event: meta\ndata: ${JSON.stringify({
          contextLabel,
          sources: [{ label: "Mission", detail: "E2E Assignment" }]
        })}`,
        `event: delta\ndata: ${JSON.stringify({
          content: `**Mock AI answer** for ${body.message}\n\nInline math: \\(x^2 + 1\\)\n\n`
        })}`,
        `event: delta\ndata: ${JSON.stringify({
          content: "- Review the mission brief\n- Ask for hints"
        })}`,
        "event: done\ndata: {}",
        ""
      ].join("\n\n")
    });
  });

  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}`);
  await page.getByRole("button", { name: "Open Questora Assistant" }).click();
  await expect(page.getByRole("dialog", { name: "Questora Assistant" })).toBeVisible();
  await expect(page.getByText("Using current realm")).toBeVisible();
  await page.getByRole("button", { name: "Summarize this" }).click();
  await expect(page.getByText("Mock AI answer")).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  await expect(page.getByText("Review the mission brief")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Open Questora Assistant" }).click();
  await expect(page.getByText("Mock AI answer")).toHaveCount(0);
  await page.getByRole("button", { name: "Close assistant" }).click();

  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.assignment.id}`);
  await page.getByRole("button", { name: "Open Questora Assistant" }).click();
  await expect(page.getByText("Using current mission")).toBeVisible();
  await page.getByPlaceholder("Ask about this page...").fill("Give me a hint");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Mock AI answer")).toBeVisible();
  await expect(page.getByText("Mission: E2E Assignment")).toBeVisible();

  await page.goto("/account");
  await page.getByRole("button", { name: "Open Questora Assistant" }).click();
  await expect(page.getByText("General help")).toBeVisible();
  expect(requests).toBeGreaterThanOrEqual(2);
});

test("student previews mission resources inline beside the assistant", async ({ page }) => {
  const pdfResource = await db.activityResource.create({
    data: {
      activityId: seed.activities.assignment.id,
      title: "E2E Required PDF",
      description: "A previewable protected resource.",
      fileName: "e2e-resource.pdf",
      fileUrl: `s3:mission-resources/${seed.activities.assignment.id}/e2e-resource.pdf`,
      contentType: "application/pdf",
      size: 2048,
      position: 1,
      isRequired: true,
      kind: "READING",
      createdById: seed.users.lecturer.id
    }
  });
  await db.activityResource.create({
    data: {
      activityId: seed.activities.assignment.id,
      title: "E2E Asset Pack",
      description: "A download-only zip resource.",
      fileName: "assets.zip",
      fileUrl: `s3:mission-resources/${seed.activities.assignment.id}/assets.zip`,
      contentType: "application/zip",
      size: 4096,
      position: 2,
      isRequired: false,
      kind: "STARTER_FILE",
      createdById: seed.users.lecturer.id
    }
  });
  let downloadRequests = 0;
  await page.route("**/api/uploads/download", async (route) => {
    downloadRequests += 1;
    const body = route.request().postDataJSON() as { storageRef?: string };
    const fileName = body.storageRef?.includes("assets.zip") ? "assets.zip" : "e2e-resource.pdf";

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        downloadUrl: `https://downloads.questora.test/${fileName}`,
        expiresIn: 300
      })
    });
  });
  await page.route("https://downloads.questora.test/e2e-resource.pdf", async (route) => {
    await route.fulfill({
      contentType: "application/pdf",
      body: Buffer.from("%PDF-1.4\n% Questora e2e PDF preview\n")
    });
  });

  await loginAs(page, e2eUsers.student.email);
  await page.goto(`/student/classes/${seed.class.id}/activities/${seed.activities.assignment.id}`);
  await page.getByRole("button", { name: "Open Questora Assistant" }).click();
  await expect(page.getByRole("dialog", { name: "Questora Assistant" })).toBeVisible();

  await page.getByRole("button", { name: `Preview ${pdfResource.title}` }).click();
  await expect(page.getByRole("heading", { name: `Preview: ${pdfResource.title}` })).toBeVisible();
  await expect(page.locator('iframe[title="Resource PDF preview"]')).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Questora Assistant" })).toBeVisible();
  expect(downloadRequests).toBeGreaterThanOrEqual(1);

  await page.getByRole("button", { name: "Close resource preview" }).click();
  await expect(page.getByRole("heading", { name: `Preview: ${pdfResource.title}` })).toHaveCount(0);

  await page.getByRole("button", { name: "Preview E2E Asset Pack" }).click();
  await expect(page.getByText("Preview is not available for this file type.")).toBeVisible();
  await expect(page.getByText("Open or download the resource to view it.")).toBeVisible();
});
