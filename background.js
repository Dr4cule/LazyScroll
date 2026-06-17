import {
  ALLOWED_SITES_KEY,
  DEFAULT_ALLOWED_SITES,
  normalizeSites
} from "./src/site-config.js";
import { SETTINGS_KEY, normalizeSettings } from "./src/settings.js";

chrome.runtime.onInstalled.addListener(() => {
  seedAllowedSites();
  seedSettings();
});

function seedAllowedSites() {
  chrome.storage.local.get(ALLOWED_SITES_KEY, (result) => {
    const saved = result?.[ALLOWED_SITES_KEY];

    if (!Array.isArray(saved)) {
      chrome.storage.local.set({ [ALLOWED_SITES_KEY]: [...DEFAULT_ALLOWED_SITES] });
      return;
    }

    // Migrate older installs that predate the singular /reel default.
    const hasReelsDefault =
      saved.includes("https://www.instagram.com/reels") ||
      saved.includes("https://instagram.com/reels");
    const hasReelDefault =
      saved.includes("https://www.instagram.com/reel") ||
      saved.includes("https://instagram.com/reel");

    if (hasReelsDefault && !hasReelDefault) {
      chrome.storage.local.set({
        [ALLOWED_SITES_KEY]: normalizeSites([
          ...saved,
          "https://www.instagram.com/reel",
          "https://instagram.com/reel"
        ])
      });
    }
  });
}

function seedSettings() {
  chrome.storage.local.get(SETTINGS_KEY, (result) => {
    chrome.storage.local.set({
      [SETTINGS_KEY]: normalizeSettings(result?.[SETTINGS_KEY])
    });
  });
}
