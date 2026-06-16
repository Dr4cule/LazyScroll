import { test, expect } from "@playwright/test";

test("controls feed and comments on the local integration page", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/test-pages/feed.html");
  await expect(page.locator("#lazy-scroll-overlay")).toBeVisible();
  await expect(page.locator("#lazy-scroll-overlay")).toContainText("Ready. Click Start.");

  await page.locator(".lazy-scroll-start").click();
  await expect(page.locator("#lazy-scroll-overlay")).toContainText("Watching gestures");

  await page.evaluate(() => window.__lazyScrollDebug.emit("swipeUp"));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  await page.evaluate(() => window.__lazyScrollDebug.emit("seekForward"));
  await expect(page.locator(".test-video")).toHaveJSProperty("currentTime", 25);

  await page.evaluate(() => window.__lazyScrollDebug.emit("seekBackward"));
  await expect(page.locator(".test-video")).toHaveJSProperty("currentTime", 20);

  await page.evaluate(() => window.__lazyScrollDebug.emit("toggleLike"));
  await expect(page.locator(".like-button")).toHaveAttribute("data-liked", "true");

  await page.evaluate(() => window.__lazyScrollDebug.emit("openComments"));
  await expect(page.locator(".comments")).toHaveAttribute("data-open", "true");

  const feedScrollBeforeCommentsGesture = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.__lazyScrollDebug.emit("swipeUp"));
  await expect.poll(() => page.locator(".comments-scroll").evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(feedScrollBeforeCommentsGesture);

  await page.evaluate(() => window.__lazyScrollDebug.emit("swipeDown"));
  await expect.poll(() => page.locator(".comments-scroll").evaluate((element) => element.scrollTop)).toBeLessThan(700);

  await page.evaluate(() => window.__lazyScrollDebug.emit("closeComments"));
  await expect(page.locator(".comments")).toHaveAttribute("data-open", "false");
});
