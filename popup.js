import { DEFAULT_ALLOWED_SITES, loadAllowedSites, normalizeSites, saveAllowedSites, suggestAllowedSite } from "./src/site-config.js";

const sitesInput = document.querySelector("#sites");
const addCurrentButton = document.querySelector("#add-current");
const saveButton = document.querySelector("#save");
const resetButton = document.querySelector("#reset");
const status = document.querySelector("#status");

init();

async function init() {
  const sites = await loadAllowedSites(chrome.storage.local);
  sitesInput.value = sites.join("\n");

  addCurrentButton.addEventListener("click", async () => {
    const site = await getCurrentSiteSuggestion();
    if (!site) {
      setStatus("This page cannot be added.");
      return;
    }

    const sites = normalizeSites([...sitesFromInput(), site]);
    sitesInput.value = sites.join("\n");
    await saveAllowedSites(chrome.storage.local, sites);
    setStatus("Added current page.");
  });

  saveButton.addEventListener("click", async () => {
    await saveAllowedSites(chrome.storage.local, sitesFromInput());
    setStatus("Saved. Refresh open pages to inject if needed.");
  });

  resetButton.addEventListener("click", async () => {
    sitesInput.value = DEFAULT_ALLOWED_SITES.join("\n");
    await saveAllowedSites(chrome.storage.local, DEFAULT_ALLOWED_SITES);
    setStatus("Reset to defaults.");
  });
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
