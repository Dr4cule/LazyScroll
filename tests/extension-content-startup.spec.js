import { test, expect, chromium } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("starts hand tracking from the real content script with a fake camera", async () => {
  const extensionPath = path.resolve(".");
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "lazy-scroll-extension-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream"
    ]
  });

  try {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    const extensionId = new URL(serviceWorker.url()).host;

    const configPage = await context.newPage();
    await configPage.goto(`chrome-extension://${extensionId}/test-pages/configure-sites.html?site=http://127.0.0.1:4173/test-pages/extension-feed.html`);
    await expect(configPage.locator("#status")).toHaveText("ok");
    await configPage.close();

    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/test-pages/extension-feed.html");
    await expect(page.locator("#lazy-scroll-overlay")).toBeVisible();
    await page.locator(".lazy-scroll-start").click();
    await expect(page.locator("#lazy-scroll-overlay")).toContainText("Watching gestures", { timeout: 20000 });
  } finally {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
