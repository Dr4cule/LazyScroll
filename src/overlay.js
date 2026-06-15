export class LazyScrollOverlay {
  constructor(doc = document) {
    this.document = doc;
    this.root = doc.createElement("div");
    this.root.id = "lazy-scroll-overlay";
    this.root.innerHTML = `
      <div class="lazy-scroll-dot" aria-hidden="true"></div>
      <span class="lazy-scroll-status">Lazy Scroll</span>
      <button class="lazy-scroll-start" type="button">Start</button>
    `;
    this.style = doc.createElement("style");
    this.style.textContent = `
      #lazy-scroll-overlay {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 36px;
        max-width: min(320px, calc(100vw - 32px));
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 8px;
        background: rgba(18, 18, 20, .88);
        color: #f8fafc;
        font: 13px/1.2 system-ui, -apple-system, Segoe UI, sans-serif;
        box-shadow: 0 8px 26px rgba(0,0,0,.24);
        backdrop-filter: blur(8px);
      }
      #lazy-scroll-overlay .lazy-scroll-dot {
        width: 9px;
        height: 9px;
        flex: 0 0 auto;
        border-radius: 50%;
        background: #f59e0b;
      }
      #lazy-scroll-overlay[data-state="ready"] .lazy-scroll-dot { background: #22c55e; }
      #lazy-scroll-overlay[data-state="error"] .lazy-scroll-dot { background: #ef4444; }
      #lazy-scroll-overlay .lazy-scroll-status {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #lazy-scroll-overlay .lazy-scroll-start {
        flex: 0 0 auto;
        border: 0;
        border-radius: 6px;
        padding: 5px 8px;
        color: #101114;
        background: #f8fafc;
        font: 600 12px/1 system-ui, -apple-system, Segoe UI, sans-serif;
        cursor: pointer;
      }
      #lazy-scroll-overlay[data-started="true"] .lazy-scroll-start { display: none; }
    `;
    doc.documentElement.append(this.style, this.root);
    this.status = this.root.querySelector(".lazy-scroll-status");
    this.startButton = this.root.querySelector(".lazy-scroll-start");
  }

  onStart(callback) {
    this.startButton.addEventListener("click", callback);
  }

  setStatus(text, state = "idle") {
    this.status.textContent = text;
    this.root.dataset.state = state;
  }

  setStarted(started) {
    this.root.dataset.started = String(started);
  }

  setBusy(busy) {
    this.startButton.disabled = busy;
    this.startButton.textContent = busy ? "Starting" : "Start";
  }

  destroy() {
    this.style.remove();
    this.root.remove();
  }
}
