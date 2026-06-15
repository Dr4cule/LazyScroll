chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("lazyScrollAllowedSites", (result) => {
    if (!Array.isArray(result.lazyScrollAllowedSites)) {
      chrome.storage.local.set({
        lazyScrollAllowedSites: [
          "https://www.youtube.com/shorts",
          "https://youtube.com/shorts",
          "https://m.youtube.com/shorts",
          "https://www.instagram.com/reels",
          "https://instagram.com/reels",
          "https://www.tiktok.com",
          "https://tiktok.com"
        ]
      });
    }
  });
});
