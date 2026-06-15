import { test, expect, chromium } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("loads MediaPipe from the packaged extension context", async () => {
  const extensionPath = path.resolve(".");
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "lazy-scroll-extension-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  try {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    const extensionId = new URL(serviceWorker.url()).host;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/test-pages/extension-mediapipe.html`);
    await expect(page.locator("#status")).toHaveText("ok", { timeout: 15000 });
  } finally {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
