import { test, expect } from "@playwright/test";

const LANG = "uk";

test.describe("Sign-in page", () => {
  test("renders email and password fields", async ({ page }) => {
    await page.goto(`/${LANG}/auth/signin`);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows validation error on empty submit", async ({ page }) => {
    await page.goto(`/${LANG}/auth/signin`);
    await page.locator('button[type="submit"]').click();

    // Browser native validation should prevent submission; URL stays the same
    await expect(page).toHaveURL(new RegExp(`/${LANG}/auth/signin`));
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto(`/${LANG}/auth/signin`);
    await page.fill('input[type="email"]', "notexist@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.locator('button[type="submit"]').click();

    // Should stay on sign-in or show an error — not redirect to dashboard
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain("/dashboard");
  });
});

test.describe("Register page", () => {
  test("renders registration form", async ({ page }) => {
    await page.goto(`/${LANG}/auth/register`);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe("Protected routes redirect", () => {
  test("unauthenticated /dashboard redirects to sign-in", async ({ page }) => {
    await page.goto(`/${LANG}/dashboard`);
    await expect(page).toHaveURL(new RegExp(`/${LANG}/auth/signin`));
  });

  test("unauthenticated /settings redirects to sign-in", async ({ page }) => {
    await page.goto(`/${LANG}/settings`);
    await expect(page).toHaveURL(new RegExp(`/${LANG}/auth/signin`));
  });

  test("unauthenticated /calls redirects to sign-in", async ({ page }) => {
    await page.goto(`/${LANG}/calls`);
    await expect(page).toHaveURL(new RegExp(`/${LANG}/auth/signin`));
  });
});
