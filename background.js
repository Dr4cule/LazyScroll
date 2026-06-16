chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("lazyScrollAllowedSites", (result) => {
    const defaultSites = [
      "https://www.youtube.com/shorts",
      "https://youtube.com/shorts",
      "https://m.youtube.com/shorts",
      "https://www.instagram.com/reel",
      "https://instagram.com/reel",
      "https://www.instagram.com/reels",
      "https://instagram.com/reels",
      "https://www.tiktok.com",
      "https://tiktok.com"
    ];

    if (!Array.isArray(result.lazyScrollAllowedSites)) {
      chrome.storage.local.set({
        lazyScrollAllowedSites: defaultSites
      });
      return;
    }

    const hasOldInstagramDefaults =
      result.lazyScrollAllowedSites.includes("https://www.instagram.com/reels") ||
      result.lazyScrollAllowedSites.includes("https://instagram.com/reels");
    const hasSingularInstagramReel =
      result.lazyScrollAllowedSites.includes("https://www.instagram.com/reel") ||
      result.lazyScrollAllowedSites.includes("https://instagram.com/reel");

    if (hasOldInstagramDefaults && !hasSingularInstagramReel) {
      chrome.storage.local.set({
        lazyScrollAllowedSites: Array.from(new Set([
          ...result.lazyScrollAllowedSites,
          "https://www.instagram.com/reel",
          "https://instagram.com/reel"
        ]))
      });
    }
  });
});
