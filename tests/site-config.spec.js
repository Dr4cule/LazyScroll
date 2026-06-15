import { test, expect } from "@playwright/test";
import { DEFAULT_ALLOWED_SITES, isUrlAllowed, normalizeSites } from "../src/site-config.js";

test("matches default social video URLs", () => {
  expect(isUrlAllowed("https://www.youtube.com/shorts/abc", DEFAULT_ALLOWED_SITES)).toBe(true);
  expect(isUrlAllowed("https://www.youtube.com/shorts/K4IQs5t1a2w", DEFAULT_ALLOWED_SITES)).toBe(true);
  expect(isUrlAllowed("https://m.youtube.com/shorts/K4IQs5t1a2w", DEFAULT_ALLOWED_SITES)).toBe(true);
  expect(isUrlAllowed("https://www.instagram.com/reels/abc", DEFAULT_ALLOWED_SITES)).toBe(true);
  expect(isUrlAllowed("https://www.tiktok.com/@user/video/1", DEFAULT_ALLOWED_SITES)).toBe(true);
  expect(isUrlAllowed("https://example.com/watch", DEFAULT_ALLOWED_SITES)).toBe(false);
});

test("matches user-entered hosts, prefixes, and wildcards", () => {
  const sites = normalizeSites([
    "example.com",
    "https://video.test/reels",
    "https://*.demo.test/watch/*"
  ]);

  expect(isUrlAllowed("https://www.example.com/anything", sites)).toBe(true);
  expect(isUrlAllowed("https://video.test/reels/123", sites)).toBe(true);
  expect(isUrlAllowed("https://app.demo.test/watch/123", sites)).toBe(true);
  expect(isUrlAllowed("https://video.test/feed/123", sites)).toBe(false);
});
