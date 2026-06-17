import {
  DEFAULT_ALLOWED_SITES,
  loadAllowedSites,
  normalizeSites,
  saveAllowedSites,
  suggestAllowedSite
} from "./src/site-config.js";
import { loadSettings, saveSettings } from "./src/settings.js";

const sitesInput = document.querySelector("#sites");
const addCurrentButton = document.querySelector("#add-current");
const saveButton = document.querySelector("#save");
const resetButton = document.querySelector("#reset");
const status = document.querySelector("#status");
const enabledToggle = document.querySelector("#enabled");
const sensitivitySelect = document.querySelector("#sensitivity");
const seekRange = document.querySelector("#seek");
const seekValue = document.querySelector("#seek-value");
const showHintsToggle = document.querySelector("#show-hints");

let settings = null;

init();

async function init() {
  const [sites, loadedSettings] = await Promise.all([
    loadAllowedSites(chrome.storage.local),
    loadSettings(chrome.storage.local)
  ]);

  settings = loadedSettings;
  sitesInput.value = sites.join("\n");
  renderSettings();

  enabledToggle.addEventListener("change", () => {
    persistSettings({ enabled: enabledToggle.checked });
    setStatus(enabledToggle.checked ? "Gestures enabled." : "Gestures paused.");
  });

  sensitivitySelect.addEventListener("change", () => {
    persistSettings({ sensitivity: sensitivitySelect.value });
    setStatus("Sensitivity updated.");
  });

  seekRange.addEventListener("input", () => {
    seekValue.textContent = `${seekRange.value}s`;
  });
  seekRange.addEventListener("change", () => {
    persistSettings({ seekSeconds: Number(seekRange.value) });
    setStatus("Seek step updated.");
  });

  showHintsToggle.addEventListener("change", () => {
    persistSettings({ showHints: showHintsToggle.checked });
  });

  addCurrentButton.addEventListener("click", async () => {
    const site = await getCurrentSiteSuggestion();
    if (!site) {
      setStatus("This page cannot be added.");
      return;
    }

    const updated = normalizeSites([...sitesFromInput(), site]);
    sitesInput.value = updated.join("\n");
    await saveAllowedSites(chrome.storage.local, updated);
    setStatus("Added current page.");
  });

  saveButton.addEventListener("click", async () => {
    await saveAllowedSites(chrome.storage.local, sitesFromInput());
    setStatus("Saved. Refresh open pages to apply.");
  });

  resetButton.addEventListener("click", async () => {
    sitesInput.value = DEFAULT_ALLOWED_SITES.join("\n");
    await saveAllowedSites(chrome.storage.local, DEFAULT_ALLOWED_SITES);
    setStatus("Reset to defaults.");
  });
}

function renderSettings() {
  enabledToggle.checked = settings.enabled;
  sensitivitySelect.value = settings.sensitivity;
  seekRange.value = String(settings.seekSeconds);
  seekValue.textContent = `${settings.seekSeconds}s`;
  showHintsToggle.checked = settings.showHints;
}

async function persistSettings(patch) {
  settings = await saveSettings(chrome.storage.local, { ...settings, ...patch });
  renderSettings();
}

function sitesFromInput() {
  return sitesInput.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getCurrentSiteSuggestion() {
  return new Promise((resolve) => {
    if (!chrome.tabs?.query) {
      resolve("");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab] = []) => {
      resolve(suggestAllowedSite(tab?.url || ""));
    });
  });
}

function setStatus(message) {
  status.textContent = message;
  window.setTimeout(() => {
    status.textContent = "";
  }, 2600);
}
