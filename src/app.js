import { GestureRecognizer } from "./gesture-recognizer.js";
import { MediaPipeHandProvider } from "./mediapipe-provider.js";
import { LazyScrollOverlay } from "./overlay.js";
import { SiteAdapter } from "./site-adapter.js";
import { deriveRecognizerOptions, normalizeSettings } from "./settings.js";

export async function mountLazyScroll({ runtimeUrl, provider, settings } = {}) {
  if (window.__lazyScrollMounted) {
    return window.__lazyScrollApp;
  }

  let currentSettings = normalizeSettings(settings);

  const overlay = new LazyScrollOverlay(document);
  const recognizer = new GestureRecognizer(deriveRecognizerOptions(currentSettings));
  const adapter = new SiteAdapter(document, { seekSeconds: currentSettings.seekSeconds });
  const handProvider = provider || new MediaPipeHandProvider({ runtimeUrl });
  let starting = false;
  let lastLandmarksAt = 0;
  let lastPassiveStatusAt = 0;
  let trackingStatusTimer = null;

  const stopTrackingStatusTimer = () => {
    window.clearInterval(trackingStatusTimer);
    trackingStatusTimer = null;
  };

  const startTrackingStatusTimer = () => {
    stopTrackingStatusTimer();
    trackingStatusTimer = window.setInterval(() => {
      if (!handProvider.running) {
        return;
      }

      const now = performance.now();
      if (!lastLandmarksAt || now - lastLandmarksAt > 1800) {
        overlay.setStatus("No hand detected", "idle");
      }
    }, 900);
  };

  const app = {
    adapter,
    recognizer,
    get settings() {
      return currentSettings;
    },
    applySettings: (next) => {
      const previous = currentSettings;
      currentSettings = normalizeSettings(next);
      recognizer.configure(deriveRecognizerOptions(currentSettings));
      adapter.configure({ seekSeconds: currentSettings.seekSeconds });
      // Only react to a deliberate hint-preference change, so SPA navigation
      // does not slam shut a guide the user opened with the ? button.
      if (previous.showHints !== currentSettings.showHints) {
        overlay.toggleGuide(currentSettings.showHints);
      }
      return currentSettings;
    },
    start: async () => {
      if (starting || handProvider.running) {
        return;
      }
      starting = true;
      overlay.setBusy(true);
      overlay.setStarted(true);
      try {
        await handProvider.start(
          (landmarks, timestamp) => {
            lastLandmarksAt = timestamp;
            const action = recognizer.analyze(landmarks, timestamp);
            if (action) {
              adapter.handle(action);
              overlay.setStatus(actionLabel(action), "ready");
              lastPassiveStatusAt = timestamp;
              return;
            }

            if (timestamp - lastPassiveStatusAt > 1000) {
              overlay.setStatus("Hand detected", "ready");
              lastPassiveStatusAt = timestamp;
            }
          },
          (status) => overlay.setStatus(status, "idle")
        );
        lastLandmarksAt = performance.now();
        lastPassiveStatusAt = lastLandmarksAt;
        startTrackingStatusTimer();
        overlay.setStatus("Watching gestures", "ready");
      } catch (error) {
        overlay.setStarted(false);
        overlay.setStatus(error.userMessage || "Could not start camera", "error");
        console.error("[Lazy Scroll] Camera start failed", error);
      } finally {
        starting = false;
        overlay.setBusy(false);
      }
    },
    stop: () => {
      stopTrackingStatusTimer();
      handProvider.stop();
      recognizer.reset();
      lastLandmarksAt = 0;
      overlay.setBusy(false);
      overlay.setStarted(false);
      overlay.setStatus("Paused. Click Start.", "idle");
    },
    emit: (action) => adapter.handle(action),
    destroy: () => {
      stopTrackingStatusTimer();
      handProvider.stop();
      overlay.destroy();
      delete window.__lazyScrollMounted;
      delete window.__lazyScrollApp;
      delete window.__lazyScrollDebug;
    }
  };

  overlay.onStart(() => {
    if (handProvider.running) {
      app.stop();
      return;
    }
    app.start();
  });
  window.__lazyScrollMounted = true;
  window.__lazyScrollApp = app;
  window.__lazyScrollDebug = {
    emit: (action) => app.emit(action),
    landmarks: (landmarks, timestamp = performance.now()) => {
      const action = recognizer.analyze(landmarks, timestamp);
      return action ? { action, handled: adapter.handle(action) } : { action: null, handled: false };
    },
    app
  };

  overlay.setStatus("Ready. Click Start.", "idle");
  overlay.toggleGuide(currentSettings.showHints);
  return app;
}

function actionLabel(action) {
  return {
    swipeUp: "Next",
    swipeDown: "Previous",
    openComments: "Open comments",
    closeComments: "Close comments",
    toggleLike: "Like",
    seekForward: "Forward",
    seekBackward: "Back"
  }[action] || "Watching gestures";
}
