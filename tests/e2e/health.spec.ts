import { test, expect } from "@playwright/test";

test("health endpoint returns ok", async ({ request }) => {
  const response = await request.get("/api/v1/health");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { status: string } };
  expect(body.data.status).toBe("ok");
});

test("homepage loads without errors", async ({ page }) => {
  await page.goto("/");
  await expect(page).not.toHaveURL(/error/);
  await expect(page.locator("body")).toBeVisible();
});
