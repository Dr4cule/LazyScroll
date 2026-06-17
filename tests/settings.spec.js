import { test, expect } from "@playwright/test";
import {
  DEFAULT_SETTINGS,
  SENSITIVITY_PRESETS,
  deriveRecognizerOptions,
  normalizeSettings,
  loadSettings,
  saveSettings
} from "../src/settings.js";
import { GestureRecognizer } from "../src/gesture-recognizer.js";

test("normalizes missing, partial, and invalid settings to safe values", () => {
  expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);

  const partial = normalizeSettings({ sensitivity: "bogus", seekSeconds: 9999, enabled: "yes" });
  expect(partial.sensitivity).toBe("medium");
  expect(partial.seekSeconds).toBe(30);
  expect(partial.enabled).toBe(DEFAULT_SETTINGS.enabled);

  expect(normalizeSettings({ seekSeconds: -4 }).seekSeconds).toBe(1);
  expect(normalizeSettings({ seekSeconds: 12.7 }).seekSeconds).toBe(13);
  expect(normalizeSettings({ enabled: false }).enabled).toBe(false);
});

test("derives recognizer thresholds from the chosen sensitivity preset", () => {
  expect(deriveRecognizerOptions({ sensitivity: "high" }).swipeThreshold)
    .toBe(SENSITIVITY_PRESETS.high.swipeThreshold);
  expect(deriveRecognizerOptions({ sensitivity: "low" }).swipeThreshold)
    .toBe(SENSITIVITY_PRESETS.low.swipeThreshold);

  const high = deriveRecognizerOptions({ sensitivity: "high" });
  const low = deriveRecognizerOptions({ sensitivity: "low" });
  expect(high.swipeThreshold).toBeLessThan(low.swipeThreshold);
  expect(high.cooldownMs).toBeLessThan(low.cooldownMs);
});

test("configure updates only known tunable thresholds", () => {
  const recognizer = new GestureRecognizer();
  recognizer.configure({ swipeThreshold: 0.1, cooldownMs: 999, bogus: 5, pinchThreshold: NaN });
  expect(recognizer.swipeThreshold).toBe(0.1);
  expect(recognizer.cooldownMs).toBe(999);
  expect(recognizer.bogus).toBeUndefined();
  // Invalid values are ignored, keeping the previous setting.
  expect(recognizer.pinchThreshold).toBe(0.06);
});

test("load and save round-trip through a storage area", async () => {
  const store = new Map();
  const storageArea = {
    get: (key, cb) => cb(store.has(key) ? { [key]: store.get(key) } : {}),
    set: (value, cb) => {
      for (const [key, item] of Object.entries(value)) {
        store.set(key, item);
      }
      cb?.();
    }
  };

  expect(await loadSettings(storageArea)).toEqual(DEFAULT_SETTINGS);

  const saved = await saveSettings(storageArea, { sensitivity: "high", seekSeconds: 10 });
  expect(saved.sensitivity).toBe("high");
  expect(await loadSettings(storageArea)).toEqual(saved);
});
