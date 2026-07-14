import { expect, test } from "@playwright/test";

import { e2eUsers, resetE2eDatabase, type E2eSeed } from "./fixtures";
import { loginAs } from "./helpers";

let seed: E2eSeed;

test.beforeEach(async () => {
  seed = await resetE2eDatabase();
});

test("admin can log in and view dashboard stats", async ({ page }) => {
  await loginAs(page, e2eUsers.admin.email);

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin command hall" })).toBeVisible();
  await expect(page.getByText("Total users")).toBeVisible();
  await expect(page.getByText("Active realms")).toBeVisible();
});

test("admin can enroll an active student into a realm", async ({ page }) => {
  await loginAs(page, e2eUsers.admin.email);
  await page.goto(`/admin/classes/${seed.class.id}`);

  await page.getByLabel("Student").selectOption({ label: `${e2eUsers.unenrolled.name} (${e2eUsers.unenrolled.email})` });
  await page.getByRole("button", { name: "Enroll student" }).click();

  await expect(page.getByText("Student enrolled.")).toBeVisible();
  await expect(page.getByText(e2eUsers.unenrolled.name)).toBeVisible();
});
