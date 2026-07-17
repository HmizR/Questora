import { expect, test, type Page } from "@playwright/test";

import { e2ePassword, e2eUsers, resetE2eDatabase, type E2eSeed } from "./fixtures";
import { loginAs, logout } from "./helpers";

let seed: E2eSeed;

test.beforeEach(async () => {
  seed = await resetE2eDatabase();
});

async function mockAvatarUpload(page: Page) {
  await page.route("**/api/uploads/presign", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        uploadUrl: "https://uploads.questora.test/e2e-avatar.png",
        storageRef: `s3:avatars/${seed.users.student.id}/e2e-avatar.png`,
        key: `avatars/${seed.users.student.id}/e2e-avatar.png`,
        expiresIn: 300
      })
    });
  });
  await page.route("https://uploads.questora.test/e2e-avatar.png", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });
}

async function mockAvatarDownload(page: Page) {
  await page.route("**/api/uploads/download", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        downloadUrl: "https://downloads.questora.test/e2e-avatar.png",
        expiresIn: 300
      })
    });
  });
}

test("user updates profile and changes own password", async ({ page }) => {
  await mockAvatarUpload(page);
  await mockAvatarDownload(page);
  await loginAs(page, e2eUsers.student.email);
  await page.goto("/account");

  await page.getByLabel("Name").fill("E2E Student Updated");
  await page.setInputFiles("#avatar-file", {
    name: "e2e-avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from("E2E avatar image")
  });
  await expect(page.getByRole("status").filter({ hasText: "Avatar uploaded." })).toBeVisible();
  await expect(page.getByText("e2e-avatar.png (protected)")).toBeVisible();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile updated." })).toBeVisible();
  await expect(page.getByRole("main").getByText("E2E Student Updated", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("E2E Student Updated avatar").first()).toBeVisible();

  await page.goto("/student/leaderboard");
  await expect(page.getByLabel("E2E Student Updated avatar").first()).toBeVisible();
  await page.getByRole("link", { name: "E2E Student Updated" }).click();
  await expect(page.getByRole("heading", { name: "E2E Student Updated's profile" })).toBeVisible();
  await expect(page.getByLabel("E2E Student Updated avatar").first()).toBeVisible();

  await page.goto("/account");

  await page.getByLabel("Current password").fill(e2ePassword);
  await page.getByRole("textbox", { name: "New password", exact: true }).fill("ChangedPassword123!");
  await page.getByRole("textbox", { name: "Confirm new password" }).fill("ChangedPassword123!");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Password changed." })).toBeVisible();

  await logout(page);
  await loginAs(page, e2eUsers.student.email, "ChangedPassword123!");
  await expect(page).toHaveURL(/\/student$/);

  await logout(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(e2eUsers.student.email);
  await page.getByLabel("Password").fill(e2ePassword);
  await page.getByRole("button", { name: "Enter Questora" }).click();
  await expect(page.getByText("Invalid credentials or inactive account.")).toBeVisible();
});

test("user can still save a pasted avatar URL", async ({ page }) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto("/account");

  await page.getByLabel("Avatar URL").fill("https://example.com/e2e-avatar.png");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Profile updated." })).toBeVisible();
});

test("admin resets a student password", async ({ page }) => {
  await loginAs(page, e2eUsers.admin.email);
  await page.goto(`/admin/users/${seed.users.student.id}`);

  await page.getByRole("textbox", { name: "Temporary password", exact: true }).fill("ResetPassword123!");
  await page.getByRole("textbox", { name: "Confirm temporary password" }).fill("ResetPassword123!");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Password reset." })).toBeVisible();

  await logout(page);
  await loginAs(page, e2eUsers.student.email, "ResetPassword123!");
  await expect(page).toHaveURL(/\/student$/);
});
