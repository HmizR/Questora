import { expect, type Page } from "@playwright/test";

import { e2ePassword } from "./fixtures";

export async function loginAs(page: Page, email: string, password = e2ePassword) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Enter Questora" }).click();

  try {
    await expect(page.getByRole("banner")).toContainText("Questora", { timeout: 30_000 });
  } catch {
    if (!page.url().includes("/login")) {
      await page.reload();
      await expect(page.getByRole("banner")).toContainText("Questora", { timeout: 30_000 });
      return;
    }

    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Enter Questora" }).click();
    await expect(page.getByRole("banner")).toContainText("Questora", { timeout: 30_000 });
  }
}

export async function logout(page: Page) {
  await page.getByRole("banner").locator("details").last().locator("summary").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}
