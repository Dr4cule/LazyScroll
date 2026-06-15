(async () => {
  const runtimeUrl = (path) => chrome.runtime.getURL(path);
  let app = null;
  let lastHref = "";
  let syncQueued = false;

  try {
    const configModuleUrl = runtimeUrl("src/site-config.js");
    const { isUrlAllowed, loadAllowedSites } = await import(configModuleUrl);

    const syncMountState = async () => {
      const allowedSites = await loadAllowedSites(chrome.storage.local);
      const shouldRun = isUrlAllowed(window.location.href, allowedSites);

      if (shouldRun && !app) {
        const { mountLazyScroll } = await import(runtimeUrl("src/app.js"));
        app = await mountLazyScroll({ runtimeUrl });
      }

      if (!shouldRun && app) {
        app.destroy();
        app = null;
      }

      lastHref = window.location.href;
    };

    const queueSyncMountState = () => {
      if (syncQueued) {
        return;
      }
      syncQueued = true;
      window.setTimeout(() => {
        syncQueued = false;
        syncMountState().catch((error) => {
          console.error("[Lazy Scroll] Failed to sync site settings", error);
        });
      }, 100);
    };

    const installRouteWatcher = () => {
      const checkForUrlChange = () => {
        if (window.location.href !== lastHref) {
          queueSyncMountState();
        }
      };

      for (const method of ["pushState", "replaceState"]) {
        const original = history[method];
        history[method] = function patchedHistoryMethod(...args) {
          const result = original.apply(this, args);
          checkForUrlChange();
          return result;
        };
      }

      window.addEventListener("popstate", checkForUrlChange);
      window.addEventListener("hashchange", checkForUrlChange);

      new MutationObserver(checkForUrlChange).observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      window.setInterval(checkForUrlChange, 1000);
    };

    await syncMountState();
    installRouteWatcher();

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.lazyScrollAllowedSites) {
        queueSyncMountState();
      }
    });
  } catch (error) {
    console.error("[Lazy Scroll] Failed to start", error);
  }
})();
