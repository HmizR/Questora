import { expect, test } from "@playwright/test";

import { e2ePassword, e2eUsers, resetE2eDatabase, type E2eSeed } from "./fixtures";
import { loginAs, logout } from "./helpers";

let seed: E2eSeed;

test.beforeEach(async () => {
  seed = await resetE2eDatabase();
});

test("user updates profile and changes own password", async ({ page }) => {
  await loginAs(page, e2eUsers.student.email);
  await page.goto("/account");

  await page.getByLabel("Name").fill("E2E Student Updated");
  await page.getByLabel("Avatar URL").fill("https://example.com/e2e-avatar.png");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile updated." })).toBeVisible();
  await expect(page.getByText("E2E Student Updated")).toBeVisible();

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
