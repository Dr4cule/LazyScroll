import { test, expect } from "@playwright/test";

test("loads the bundled MediaPipe hand model", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/test-pages/feed.html");

  const result = await page.evaluate(async () => {
    const { FilesetResolver, HandLandmarker } = await import("/vendor/tasks-vision/vision_bundle.mjs");
    const vision = await FilesetResolver.forVisionTasks("/vendor/tasks-vision/wasm/");
    const response = await fetch("/vendor/models/hand_landmarker.task");
    const modelAssetBuffer = new Uint8Array(await response.arrayBuffer());
    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetBuffer,
        delegate: "CPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });
    landmarker.close();
    return "ok";
  });

  expect(result).toBe("ok");
});
