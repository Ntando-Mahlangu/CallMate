import { test, expect } from "@playwright/test";

test.describe("authentication", () => {
  test("a new user can sign up and lands on the welcome screen", async ({ page }) => {
    const email = `e2e-signup-${crypto.randomUUID()}@example.com`;

    await page.goto("/sign-up");
    await page.locator("#firstName").fill("Ada");
    await page.locator("#lastName").fill("Lovelace");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(/\/welcome/);
    await expect(page.getByRole("heading", { name: /Welcome, Ada\./ })).toBeVisible();
  });

  test("signing in with unknown credentials shows a friendly error, not a stack trace", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.locator("#email").fill("nobody-e2e@example.com");
    await page.locator("#password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
