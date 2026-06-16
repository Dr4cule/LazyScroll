import { test, expect } from "@playwright/test";
import { DEFAULT_ALLOWED_SITES, isUrlAllowed, normalizeSites, suggestAllowedSite } from "../src/site-config.js";

test("matches default social video URLs", () => {
  expect(isUrlAllowed("https://www.youtube.com/shorts/abc", DEFAULT_ALLOWED_SITES)).toBe(true);
  expect(isUrlAllowed("https://www.youtube.com/shorts/K4IQs5t1a2w", DEFAULT_ALLOWED_SITES)).toBe(true);
  expect(isUrlAllowed("https://m.youtube.com/shorts/K4IQs5t1a2w", DEFAULT_ALLOWED_SITES)).toBe(true);
  expect(isUrlAllowed("https://www.instagram.com/reel/ABC123/", DEFAULT_ALLOWED_SITES)).toBe(true);
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

test("suggests useful allow-list entries from the current tab URL", () => {
  expect(suggestAllowedSite("https://www.youtube.com/shorts/abc?feature=share")).toBe("https://www.youtube.com/shorts");
  expect(suggestAllowedSite("https://www.instagram.com/reel/ABC123/?igsh=1")).toBe("https://www.instagram.com/reel");
  expect(suggestAllowedSite("https://www.tiktok.com/@user/video/123")).toBe("https://www.tiktok.com");
  expect(suggestAllowedSite("https://example.test/watch/123?x=1#clip")).toBe("https://example.test/watch/123");
  expect(suggestAllowedSite("chrome://extensions")).toBe("");
});
