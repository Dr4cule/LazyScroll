export class MediaPipeHandProvider {
  constructor({ runtimeUrl }) {
    this.runtimeUrl = runtimeUrl;
    this.frame = null;
    this.trackerWindow = null;
    this.running = false;
    this.onLandmarks = null;
    this.onStatus = null;
    this.startTimeout = null;
    this.handleMessage = this.handleMessage.bind(this);
  }

  async start(onLandmarks, onStatus) {
    if (this.running) {
      return;
    }

    this.onLandmarks = onLandmarks;
    this.onStatus = onStatus;
    this.onStatus?.("Opening tracker");

    if (shouldUsePopupTracker(window.location.hostname)) {
      this.onStatus?.("Opening extension camera window");
      this.trackerWindow = window.open(
        this.runtimeUrl("src/hand-frame.html?mode=popup"),
        "lazy-scroll-hand-tracker",
        "popup=yes,width=320,height=180,left=40,top=40"
      );
      if (!this.trackerWindow) {
        throw userFacingError("Camera window was blocked. Allow popups for this page and try again.");
      }
    } else {
      this.frame = document.createElement("iframe");
      this.frame.src = this.runtimeUrl("src/hand-frame.html");
      this.frame.allow = "camera *";
      this.frame.title = "Lazy Scroll hand tracker";
      this.frame.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;border:0;opacity:.01;pointer-events:none;z-index:-1;";
      document.documentElement.append(this.frame);
    }

    window.addEventListener("message", this.handleMessage);

    this.startTimeout = window.setTimeout(() => {
      const error = userFacingError("Hand tracker did not respond");
      const reject = this.pendingReject;
      this.stop();
      reject?.(error);
    }, 25000);

    await new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
    });
  }

  stop() {
    this.running = false;
    window.clearTimeout(this.startTimeout);
    window.removeEventListener("message", this.handleMessage);
    this.getTrackerWindow()?.postMessage({ source: "lazy-scroll", type: "stop" }, "*");
    this.frame?.remove();
    this.trackerWindow?.close();
    this.frame = null;
    this.trackerWindow = null;
    this.onLandmarks = null;
    this.onStatus = null;
    this.pendingResolve = null;
    this.pendingReject = null;
  }

  handleMessage(event) {
    if (event.source !== this.getTrackerWindow() || event.data?.source !== "lazy-scroll-hand-frame") {
      return;
    }

    const { type, payload } = event.data;
    if (type === "status") {
      this.onStatus?.(payload);
      return;
    }

    if (type === "ready") {
      this.running = true;
      window.clearTimeout(this.startTimeout);
      this.onStatus?.("Watching gestures");
      this.pendingResolve?.();
      this.pendingResolve = null;
      this.pendingReject = null;
      return;
    }

    if (type === "landmarks") {
      this.onLandmarks?.(payload.landmarks, payload.timestamp);
      return;
    }

    if (type === "error") {
      const error = userFacingError(payload || "Could not start hand tracking");
      const reject = this.pendingReject;
      this.stop();
      reject?.(error);
    }
  }

  getTrackerWindow() {
    return this.frame?.contentWindow || this.trackerWindow;
  }
}

function userFacingError(message) {
  const error = new Error(message);
  error.userMessage = message;
  return error;
}

function shouldUsePopupTracker(hostname) {
  return /(^|\.)instagram\.com$/i.test(hostname);
}
