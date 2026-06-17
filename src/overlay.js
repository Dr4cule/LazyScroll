const POSITION_KEY = "lazyScrollOverlayPosition";

const GESTURE_GUIDE = [
  { icon: "☝️", name: "Point + swipe up", action: "Next reel" },
  { icon: "👇", name: "Point + swipe down", action: "Previous reel" },
  { icon: "✌️", name: "Hold two fingers up / down", action: "Keep scrolling" },
  { icon: "🖐️", name: "Hold open palm", action: "Open comments" },
  { icon: "✊", name: "Close into a fist", action: "Close comments" },
  { icon: "🤙", name: "Hold pinky up", action: "Like / unlike" },
  { icon: "🤏", name: "Pinch + slide right", action: "Seek forward" },
  { icon: "🤏", name: "Pinch + slide left", action: "Seek back" }
];

export class LazyScrollOverlay {
  constructor(doc = document) {
    this.document = doc;
    this.dragState = null;
    this.onDragMove = this.onDragMove.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);

    this.root = doc.createElement("div");
    this.root.id = "lazy-scroll-overlay";
    this.root.dataset.state = "idle";
    this.root.innerHTML = `
      <div class="lazy-scroll-bar">
        <div class="lazy-scroll-dot" aria-hidden="true"></div>
        <span class="lazy-scroll-status">Lazy Scroll</span>
        <button class="lazy-scroll-help" type="button" aria-label="Show gesture guide" aria-expanded="false" title="Gesture guide">?</button>
        <button class="lazy-scroll-start" type="button">Start</button>
      </div>
      <div class="lazy-scroll-guide" hidden>
        <div class="lazy-scroll-guide-head">Gesture guide</div>
        <ul class="lazy-scroll-guide-list">
          ${GESTURE_GUIDE.map((item) => `
            <li>
              <span class="lazy-scroll-guide-icon" aria-hidden="true">${item.icon}</span>
              <span class="lazy-scroll-guide-name">${item.name}</span>
              <span class="lazy-scroll-guide-action">${item.action}</span>
            </li>`).join("")}
        </ul>
        <div class="lazy-scroll-guide-foot">Drag the bar to move it · gestures stay local to your browser</div>
      </div>
    `;

    this.style = doc.createElement("style");
    this.style.textContent = OVERLAY_CSS;

    doc.documentElement.append(this.style, this.root);
    this.bar = this.root.querySelector(".lazy-scroll-bar");
    this.status = this.root.querySelector(".lazy-scroll-status");
    this.startButton = this.root.querySelector(".lazy-scroll-start");
    this.helpButton = this.root.querySelector(".lazy-scroll-help");
    this.guide = this.root.querySelector(".lazy-scroll-guide");

    this.helpButton.addEventListener("click", () => this.toggleGuide());
    this.bar.addEventListener("pointerdown", (event) => this.onDragStart(event));

    this.restorePosition();
  }

  onStart(callback) {
    this.startButton.addEventListener("click", callback);
  }

  setStatus(text, state = "idle") {
    this.status.textContent = text;
    this.status.title = text;
    this.root.dataset.state = state;
  }

  setStarted(started) {
    this.root.dataset.started = String(started);
    this.startButton.textContent = started ? "Stop" : "Start";
  }

  setBusy(busy) {
    this.startButton.disabled = busy;
    this.startButton.textContent = busy
      ? "Starting"
      : this.root.dataset.started === "true" ? "Stop" : "Start";
  }

  toggleGuide(force) {
    const next = typeof force === "boolean" ? force : this.guide.hidden;
    this.guide.hidden = !next;
    this.helpButton.setAttribute("aria-expanded", String(next));
  }

  onDragStart(event) {
    // Ignore drags that begin on interactive controls.
    if (event.target.closest("button")) {
      return;
    }
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    const rect = this.root.getBoundingClientRect();
    this.dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false
    };
    this.root.dataset.dragging = "true";
    this.document.addEventListener("pointermove", this.onDragMove);
    this.document.addEventListener("pointerup", this.onDragEnd);
    this.document.addEventListener("pointercancel", this.onDragEnd);
  }

  onDragMove(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }
    const view = this.document.defaultView || window;
    const width = this.root.offsetWidth;
    const height = this.root.offsetHeight;
    const maxLeft = Math.max(0, view.innerWidth - width);
    const maxTop = Math.max(0, view.innerHeight - height);
    const left = clamp(event.clientX - this.dragState.offsetX, 0, maxLeft);
    const top = clamp(event.clientY - this.dragState.offsetY, 0, maxTop);
    this.dragState.moved = true;
    this.applyPosition(left, top);
  }

  onDragEnd(event) {
    if (!this.dragState || (event && event.pointerId !== this.dragState.pointerId)) {
      return;
    }
    const moved = this.dragState.moved;
    this.dragState = null;
    delete this.root.dataset.dragging;
    this.document.removeEventListener("pointermove", this.onDragMove);
    this.document.removeEventListener("pointerup", this.onDragEnd);
    this.document.removeEventListener("pointercancel", this.onDragEnd);
    if (moved) {
      this.savePosition();
    }
  }

  applyPosition(left, top) {
    this.root.style.left = `${Math.round(left)}px`;
    this.root.style.top = `${Math.round(top)}px`;
    this.root.style.right = "auto";
    this.root.style.bottom = "auto";
  }

  savePosition() {
    try {
      const left = parseInt(this.root.style.left, 10);
      const top = parseInt(this.root.style.top, 10);
      if (Number.isFinite(left) && Number.isFinite(top)) {
        window.localStorage.setItem(POSITION_KEY, JSON.stringify({ left, top }));
      }
    } catch {
      // Storage may be unavailable (private mode, sandboxed frame); ignore.
    }
  }

  restorePosition() {
    try {
      const saved = window.localStorage.getItem(POSITION_KEY);
      if (!saved) {
        return;
      }
      const { left, top } = JSON.parse(saved);
      if (Number.isFinite(left) && Number.isFinite(top)) {
        this.applyPosition(left, top);
      }
    } catch {
      // Ignore malformed or unavailable storage.
    }
  }

  destroy() {
    this.document.removeEventListener("pointermove", this.onDragMove);
    this.document.removeEventListener("pointerup", this.onDragEnd);
    this.document.removeEventListener("pointercancel", this.onDragEnd);
    this.style.remove();
    this.root.remove();
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const OVERLAY_CSS = `
  #lazy-scroll-overlay {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2147483647;
    width: max-content;
    max-width: min(320px, calc(100vw - 32px));
    color: #f8fafc;
    font: 13px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
    filter: drop-shadow(0 10px 28px rgba(0,0,0,.32));
  }
  #lazy-scroll-overlay .lazy-scroll-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 8px 10px;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(30,30,34,.94), rgba(16,16,19,.94));
    backdrop-filter: blur(10px);
    cursor: grab;
    user-select: none;
    touch-action: none;
  }
  #lazy-scroll-overlay[data-dragging="true"] .lazy-scroll-bar { cursor: grabbing; }
  #lazy-scroll-overlay .lazy-scroll-dot {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #f59e0b;
    box-shadow: 0 0 0 0 rgba(245,158,11,.5);
  }
  #lazy-scroll-overlay[data-state="ready"] .lazy-scroll-dot {
    background: #22c55e;
    animation: lazy-scroll-pulse 1.8s ease-out infinite;
  }
  #lazy-scroll-overlay[data-state="error"] .lazy-scroll-dot { background: #ef4444; }
  @keyframes lazy-scroll-pulse {
    0% { box-shadow: 0 0 0 0 rgba(34,197,94,.45); }
    70% { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  #lazy-scroll-overlay .lazy-scroll-status {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #lazy-scroll-overlay button {
    flex: 0 0 auto;
    border: 0;
    cursor: pointer;
    font: 600 12px/1 system-ui, -apple-system, Segoe UI, sans-serif;
  }
  #lazy-scroll-overlay .lazy-scroll-help {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    color: #e2e8f0;
    background: rgba(255,255,255,.12);
  }
  #lazy-scroll-overlay .lazy-scroll-help:hover { background: rgba(255,255,255,.22); }
  #lazy-scroll-overlay .lazy-scroll-start {
    border-radius: 6px;
    padding: 6px 12px;
    color: #101114;
    background: #f8fafc;
  }
  #lazy-scroll-overlay .lazy-scroll-start:hover { background: #ffffff; }
  #lazy-scroll-overlay[data-started="true"] .lazy-scroll-start { background: #fecaca; }
  #lazy-scroll-overlay .lazy-scroll-start:disabled { opacity: .65; cursor: default; }
  #lazy-scroll-overlay .lazy-scroll-guide {
    margin-top: 8px;
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 10px;
    background: rgba(16,16,19,.96);
    backdrop-filter: blur(10px);
  }
  #lazy-scroll-overlay .lazy-scroll-guide-head {
    font-weight: 700;
    margin-bottom: 8px;
  }
  #lazy-scroll-overlay .lazy-scroll-guide-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  #lazy-scroll-overlay .lazy-scroll-guide-list li {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    align-items: center;
    gap: 8px;
  }
  #lazy-scroll-overlay .lazy-scroll-guide-icon { text-align: center; }
  #lazy-scroll-overlay .lazy-scroll-guide-action { color: #94a3b8; }
  #lazy-scroll-overlay .lazy-scroll-guide-foot {
    margin-top: 9px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,.1);
    color: #94a3b8;
    font-size: 11px;
  }
`;
