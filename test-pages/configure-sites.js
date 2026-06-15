const status = document.querySelector("#status");
const params = new URLSearchParams(location.search);
const sites = params.getAll("site");

chrome.storage.local.set({ lazyScrollAllowedSites: sites }, () => {
  status.textContent = "ok";
});
