import { expect, test } from "@playwright/test";

import { e2eUsers, resetE2eDatabase, type E2eSeed } from "./fixtures";
import { loginAs } from "./helpers";
import { db } from "../../lib/db";

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

test("login shows a temporary lockout message after repeated failures", async ({ page }) => {
  await page.route("**/api/login/rate-limit", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ rateLimited: true })
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(e2eUsers.admin.email);
  await page.getByLabel("Password").fill("WrongPassword!");
  await page.getByRole("button", { name: "Enter Questora" }).click();
  await expect(page.getByRole("button", { name: "Enter Questora" })).toBeEnabled();

  await expect(
    page.getByText("Too many failed sign-in attempts. Please wait a minute, then try again.")
  ).toBeVisible();
});

test("login validates malformed emails while typing and on submit", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("not-an-email");
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  await page.getByLabel("Email").fill("");
  await page.getByRole("button", { name: "Enter Questora" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  await page.getByLabel("Email").fill(e2eUsers.admin.email);
  await expect(page.getByText("Enter a valid email address.")).toHaveCount(0);
});

test("admin can enroll an active student into a realm", async ({ page }) => {
  await loginAs(page, e2eUsers.admin.email);
  await page.goto(`/admin/classes/${seed.class.id}`);

  await page.getByLabel("Student").selectOption({ label: `${e2eUsers.unenrolled.name} (${e2eUsers.unenrolled.email})` });
  await page.getByRole("button", { name: "Enroll student" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Student enrolled." })).toBeVisible();
  await expect(page.getByText(e2eUsers.unenrolled.name)).toBeVisible();
});

test("admin destructive actions require confirmation", async ({ page }) => {
  await loginAs(page, e2eUsers.admin.email);
  await page.goto(`/admin/users/${seed.users.unenrolled.id}`);

  await expect(page.getByLabel(`${e2eUsers.unenrolled.name} avatar`)).toBeVisible();
  await expect(page.getByText("Active enrollments")).toBeVisible();
  await expect(page.getByText("Questora does not email password resets")).toBeVisible();

  await page.getByRole("button", { name: "Deactivate user" }).click();
  await expect(page.getByRole("dialog")).toContainText("Deactivate this user?");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    await db.user.findUniqueOrThrow({ where: { id: seed.users.unenrolled.id } })
  ).toMatchObject({ status: "ACTIVE" });

  await page.getByRole("button", { name: "Deactivate user" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Deactivate user" }).click();
  await expect(page.getByRole("status").filter({ hasText: "User deactivated." })).toBeVisible();
  await expect(
    await db.user.findUniqueOrThrow({ where: { id: seed.users.unenrolled.id } })
  ).toMatchObject({ status: "INACTIVE" });
});

test("admin remove-student action can be canceled", async ({ page }) => {
  await loginAs(page, e2eUsers.admin.email);
  await page.goto(`/admin/classes/${seed.class.id}`);

  await page.getByRole("button", { name: "Remove student" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Remove this student from the realm?");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(e2eUsers.student.name)).toBeVisible();
});
