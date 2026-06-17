import { test, expect } from "@playwright/test";

test("toggles the gesture guide from the overlay help button", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/test-pages/feed.html");

  const guide = page.locator(".lazy-scroll-guide");
  const help = page.locator(".lazy-scroll-help");

  await expect(guide).toBeHidden();
  await expect(help).toHaveAttribute("aria-expanded", "false");

  await help.click();
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("Next reel");
  await expect(help).toHaveAttribute("aria-expanded", "true");

  await help.click();
  await expect(guide).toBeHidden();
});

test("remembers a dragged overlay position across reloads", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/test-pages/feed.html");

  const overlay = page.locator("#lazy-scroll-overlay");
  const bar = page.locator(".lazy-scroll-bar");
  await expect(overlay).toBeVisible();

  const box = await bar.boundingBox();
  await page.mouse.move(box.x + 30, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(200, 200, { steps: 8 });
  await page.mouse.up();

  const movedLeft = await overlay.evaluate((el) => el.style.left);
  expect(movedLeft).not.toBe("");

  await page.reload();
  await expect(overlay).toBeVisible();
  const restoredLeft = await overlay.evaluate((el) => el.style.left);
  expect(restoredLeft).toBe(movedLeft);
});
