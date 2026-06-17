export const SETTINGS_KEY = "lazyScrollSettings";

export const SENSITIVITY_PRESETS = Object.freeze({
  low: {
    label: "Low",
    swipeThreshold: 0.09,
    pinchThreshold: 0.08,
    cooldownMs: 800,
    openHoldMs: 520,
    twoFingerHoldMs: 300,
    continuousScrollMs: 460
  },
  medium: {
    label: "Medium",
    swipeThreshold: 0.065,
    pinchThreshold: 0.06,
    cooldownMs: 650,
    openHoldMs: 420,
    twoFingerHoldMs: 220,
    continuousScrollMs: 360
  },
  high: {
    label: "High",
    swipeThreshold: 0.045,
    pinchThreshold: 0.045,
    cooldownMs: 480,
    openHoldMs: 320,
    twoFingerHoldMs: 160,
    continuousScrollMs: 280
  }
});

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  sensitivity: "medium",
  seekSeconds: 5,
  showHints: false
});

export function normalizeSettings(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const sensitivity = Object.prototype.hasOwnProperty.call(SENSITIVITY_PRESETS, value.sensitivity)
    ? value.sensitivity
    : DEFAULT_SETTINGS.sensitivity;
  const seekSeconds = clamp(Number(value.seekSeconds), 1, 30, DEFAULT_SETTINGS.seekSeconds);

  return {
    enabled: toBool(value.enabled, DEFAULT_SETTINGS.enabled),
    sensitivity,
    seekSeconds,
    showHints: toBool(value.showHints, DEFAULT_SETTINGS.showHints)
  };
}

export function deriveRecognizerOptions(settings) {
  const normalized = normalizeSettings(settings);
  const preset = SENSITIVITY_PRESETS[normalized.sensitivity] || SENSITIVITY_PRESETS.medium;
  return {
    swipeThreshold: preset.swipeThreshold,
    pinchThreshold: preset.pinchThreshold,
    cooldownMs: preset.cooldownMs,
    openHoldMs: preset.openHoldMs,
    twoFingerHoldMs: preset.twoFingerHoldMs,
    continuousScrollMs: preset.continuousScrollMs
  };
}

export async function loadSettings(storageArea) {
  const result = await storageGet(storageArea, SETTINGS_KEY);
  return normalizeSettings(result?.[SETTINGS_KEY]);
}

export async function saveSettings(storageArea, settings) {
  const normalized = normalizeSettings(settings);
  await storageSet(storageArea, { [SETTINGS_KEY]: normalized });
  return normalized;
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function toBool(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function storageGet(storageArea, key) {
  return new Promise((resolve) => {
    storageArea.get(key, resolve);
  });
}

function storageSet(storageArea, value) {
  return new Promise((resolve) => {
    storageArea.set(value, resolve);
  });
}
