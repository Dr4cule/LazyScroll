export const ALLOWED_SITES_KEY = "lazyScrollAllowedSites";

export const DEFAULT_ALLOWED_SITES = Object.freeze([
  "https://www.youtube.com/shorts",
  "https://youtube.com/shorts",
  "https://m.youtube.com/shorts",
  "https://www.instagram.com/reel",
  "https://instagram.com/reel",
  "https://www.instagram.com/reels",
  "https://instagram.com/reels",
  "https://www.tiktok.com",
  "https://tiktok.com"
]);

export async function loadAllowedSites(storageArea) {
  const result = await storageGet(storageArea, ALLOWED_SITES_KEY);
  const savedSites = result?.[ALLOWED_SITES_KEY];
  return normalizeSites(Array.isArray(savedSites) && savedSites.length ? savedSites : DEFAULT_ALLOWED_SITES);
}

export async function saveAllowedSites(storageArea, sites) {
  await storageSet(storageArea, {
    [ALLOWED_SITES_KEY]: normalizeSites(sites)
  });
}

export function normalizeSites(sites) {
  return Array.from(new Set(
    sites
      .map((site) => String(site || "").trim())
      .filter(Boolean)
  ));
}

export function isUrlAllowed(url, sites) {
  let current;
  try {
    current = new URL(url);
  } catch {
    return false;
  }

  return normalizeSites(sites).some((site) => matchesSite(current, site));
}

export function suggestAllowedSite(url) {
  let current;
  try {
    current = new URL(url);
  } catch {
    return "";
  }

  if (!["http:", "https:"].includes(current.protocol)) {
    return "";
  }

  const host = current.hostname.replace(/^www\./i, "").toLowerCase();
  const firstPathPart = current.pathname.split("/").filter(Boolean)[0] || "";
  if (host === "youtube.com" || host === "m.youtube.com") {
    return firstPathPart === "shorts" ? `${current.origin}/shorts` : current.origin;
  }
  if (host === "instagram.com") {
    if (firstPathPart === "reel" || firstPathPart === "reels") {
      return `${current.origin}/${firstPathPart}`;
    }
    return current.origin;
  }
  if (host === "tiktok.com") {
    return current.origin;
  }

  const path = current.pathname.replace(/\/+$/, "");
  return `${current.origin}${path}`;
}

function matchesSite(current, site) {
  if (site.includes("*")) {
    return wildcardToRegExp(site).test(current.href);
  }

  if (/^https?:\/\//i.test(site)) {
    const normalizedSite = site.endsWith("/") ? site : `${site}/`;
    const normalizedUrl = current.href.endsWith("/") ? current.href : `${current.href}/`;
    return normalizedUrl.startsWith(normalizedSite);
  }

  const host = site.replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
  const currentHost = current.hostname.replace(/^www\./i, "").toLowerCase();
  return currentHost === host || currentHost.endsWith(`.${host}`);
}

function wildcardToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
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
