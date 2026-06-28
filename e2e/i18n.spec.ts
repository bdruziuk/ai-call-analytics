import { test, expect } from "@playwright/test";

const LANGS = ["uk", "en", "ru"] as const;

test.describe("Language routing", () => {
  for (const lang of LANGS) {
    test(`/${lang}/auth/signin loads without error`, async ({ page }) => {
      const response = await page.goto(`/${lang}/auth/signin`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });
  }

  test("root / redirects to a valid locale", async ({ page }) => {
    await page.goto("/");
    const url = page.url();
    const hasLocale = LANGS.some((l) => url.includes(`/${l}/`) || url.endsWith(`/${l}`));
    expect(hasLocale).toBe(true);
  });
});
