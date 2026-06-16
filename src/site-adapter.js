import { GestureAction } from "./gesture-recognizer.js";

const COMMENT_OPEN_SELECTORS = {
  instagram: [
    "button[aria-label*='Comment' i]",
    "svg[aria-label*='Comment' i]"
  ],
  youtube: [
    "button[aria-label*='Comment' i]",
    "button[title*='Comment' i]",
    "ytd-button-renderer button"
  ],
  tiktok: [
    "[data-e2e='comment-icon']",
    "button[aria-label*='comment' i]",
    "[aria-label*='comment' i]"
  ],
  generic: [
    "button[aria-label*='comment' i]",
    "button[title*='comment' i]",
    "[role='button'][aria-label*='comment' i]"
  ]
};

const COMMENT_CLOSE_SELECTORS = [
  "button[aria-label*='close comments' i]",
  "button[aria-label='Close']",
  "button[title='Close']",
  "[role='button'][aria-label='Close']"
];

const LIKE_SELECTORS = {
  instagram: [
    "svg[aria-label='Like']",
    "svg[aria-label='Unlike']",
    "button[aria-label='Like']",
    "button[aria-label='Unlike']",
    "[role='button'][aria-label='Like']",
    "[role='button'][aria-label='Unlike']"
  ],
  youtube: [
    "button[aria-label*='like this video' i]",
    "button[aria-label*='unlike' i]",
    "button[title='Like']",
    "button[title='Unlike']",
    "like-button-view-model button"
  ],
  tiktok: [
    "[data-e2e='like-icon']",
    "button[aria-label*='like' i]",
    "[role='button'][aria-label*='like' i]"
  ],
  generic: [
    "button[aria-label='Like']",
    "button[aria-label='Unlike']",
    "button[aria-label*='like' i]",
    "button[title='Like']",
    "button[title='Unlike']",
    "[role='button'][aria-label='Like']",
    "[role='button'][aria-label='Unlike']",
    "[role='button'][aria-label*='like' i]"
  ]
};

const COMMENT_PANEL_SELECTORS = [
  "[data-lazy-scroll-comments]",
  "[role='dialog']",
  "ytd-engagement-panel-section-list-renderer",
  "ytd-comments",
  "[data-e2e='comment-list']",
  "section[aria-label*='comments' i]",
  "div[aria-label*='comments' i]"
];

const FEED_CONTAINER_SELECTORS = [
  "[data-lazy-scroll-feed]",
  "main",
  "[role='main']",
  "[aria-label*='reels' i]",
  "[aria-label*='shorts' i]",
  "[aria-label*='videos' i]"
];

export class SiteAdapter {
  constructor(doc = document) {
    this.document = doc;
    this.window = doc.defaultView || window;
    this.host = this.window.location.hostname;
  }

  handle(action) {
    if (action === GestureAction.OPEN_COMMENTS) {
      return this.openComments();
    }
    if (action === GestureAction.CLOSE_COMMENTS) {
      return this.closeComments();
    }
    if (action === GestureAction.TOGGLE_LIKE) {
      return this.toggleLike();
    }
    if (action === GestureAction.SWIPE_UP) {
      return this.scrollCommentsOrFeed(1);
    }
    if (action === GestureAction.SWIPE_DOWN) {
      return this.scrollCommentsOrFeed(-1);
    }
    if (action === GestureAction.SEEK_FORWARD) {
      return this.seekVideo(5);
    }
    if (action === GestureAction.SEEK_BACKWARD) {
      return this.seekVideo(-5);
    }
    return false;
  }

  scrollCommentsOrFeed(direction) {
    const panel = this.findCommentsPanel();
    if (panel) {
      const scrollTarget = findScrollableSurface(panel, direction) || panel;
      const deltaY = direction * Math.max(280, scrollTarget.clientHeight * 0.82 || 420);
      if (typeof scrollTarget.scrollBy === "function") {
        scrollTarget.scrollBy({ top: deltaY, behavior: "auto" });
      }
      return true;
    }
    return this.scrollFeed(direction);
  }

  scrollFeed(direction) {
    const nativeControl = this.findNativeFeedControl(direction);
    if (nativeControl) {
      nativeControl.click();
      return true;
    }

    const key = direction > 0 ? "ArrowDown" : "ArrowUp";
    const pageKey = direction > 0 ? "PageDown" : "PageUp";
    const deltaY = direction * Math.max(650, Math.round(this.window.innerHeight * 0.9));
    const eventTargets = [
      this.document.activeElement,
      this.findScrollableFeedContainer(direction),
      this.document.body,
      this.document.documentElement,
      this.document,
      this.window
    ].filter(Boolean);

    for (const target of eventTargets) {
      target.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }));
      target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key, code: key }));
      target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: pageKey, code: pageKey }));
    }

    this.document.scrollingElement?.scrollBy({ top: deltaY, behavior: "auto" });
    this.document.documentElement.scrollBy({ top: deltaY, behavior: "auto" });
    this.findScrollableFeedContainer(direction)?.scrollBy({ top: deltaY, behavior: "auto" });
    return true;
  }

  openComments() {
    const selectors = this.getCommentOpenSelectors();
    const target = findFirstClickable(this.document, selectors);
    if (!target) {
      return false;
    }
    target.click();
    return true;
  }

  closeComments() {
    const panel = this.findCommentsPanel();
    const panelTarget = panel ? findFirstElement(panel, COMMENT_CLOSE_SELECTORS) : null;
    if (panelTarget) {
      (panelTarget.closest("button,[role='button'],a") || panelTarget).click();
      return true;
    }

    const target = findFirstClickable(this.document, COMMENT_CLOSE_SELECTORS);
    if (target) {
      target.click();
      return true;
    }
    this.document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape", code: "Escape" }));
    return true;
  }

  toggleLike() {
    const target = findFirstClickable(this.document, this.getLikeSelectors());
    if (!target) {
      return false;
    }
    target.click();
    return true;
  }

  seekVideo(seconds) {
    const video = this.findActiveVideo();
    if (video) {
      const nextTime = video.currentTime + seconds;
      const maxTime = Number.isFinite(video.duration) ? video.duration : nextTime;
      video.currentTime = Math.max(0, Math.min(maxTime, nextTime));
      video.dispatchEvent(new Event("seeking", { bubbles: true }));
      video.dispatchEvent(new Event("timeupdate", { bubbles: true }));
      return true;
    }

    const key = seconds > 0 ? "ArrowRight" : "ArrowLeft";
    this.document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key, code: key }));
    return true;
  }

  findActiveVideo() {
    const videos = Array.from(this.document.querySelectorAll("video")).filter((video) => {
      const rect = video.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && isVisible(video);
    });
    return videos.sort((a, b) => visibleArea(b) - visibleArea(a))[0] || null;
  }

  findCommentsPanel() {
    for (const selector of COMMENT_PANEL_SELECTORS) {
      const candidates = Array.from(this.document.querySelectorAll(selector));
      const panel = candidates.find((element) => isActivePanel(element) && hasCommentSignal(element, true));
      if (panel) {
        return panel;
      }
    }
    return Array.from(this.document.querySelectorAll("*")).find((element) => {
      if (!isActivePanel(element) || !isPotentialPanelElement(element)) {
        return false;
      }
      return hasCommentSignal(element);
    }) || null;
  }

  getCommentOpenSelectors() {
    if (this.host.includes("instagram")) {
      return [...COMMENT_OPEN_SELECTORS.instagram, ...COMMENT_OPEN_SELECTORS.generic];
    }
    if (this.host.includes("youtube")) {
      return [...COMMENT_OPEN_SELECTORS.youtube, ...COMMENT_OPEN_SELECTORS.generic];
    }
    if (this.host.includes("tiktok")) {
      return [...COMMENT_OPEN_SELECTORS.tiktok, ...COMMENT_OPEN_SELECTORS.generic];
    }
    return COMMENT_OPEN_SELECTORS.generic;
  }

  getLikeSelectors() {
    if (this.host.includes("instagram")) {
      return [...LIKE_SELECTORS.instagram, ...LIKE_SELECTORS.generic];
    }
    if (this.host.includes("youtube")) {
      return [...LIKE_SELECTORS.youtube, ...LIKE_SELECTORS.generic];
    }
    if (this.host.includes("tiktok")) {
      return [...LIKE_SELECTORS.tiktok, ...LIKE_SELECTORS.generic];
    }
    return LIKE_SELECTORS.generic;
  }

  findNativeFeedControl(direction) {
    const labels = direction > 0
      ? ["Next", "Next reel", "Next video", "Next clip", "Scroll down"]
      : ["Previous", "Previous reel", "Previous video", "Previous clip", "Scroll up"];
    const selectors = labels.flatMap((label) => [
      `button[aria-label="${label}"]`,
      `button[aria-label*="${label}" i]`,
      `button[title="${label}"]`,
      `button[title*="${label}" i]`,
      `[role="button"][aria-label="${label}"]`,
      `[role="button"][aria-label*="${label}" i]`,
      `[aria-label="${label}"]`,
      `[aria-label*="${label}" i]`
    ]);
    return findFirstClickable(this.document, selectors);
  }

  findScrollableFeedContainer(direction) {
    for (const selector of FEED_CONTAINER_SELECTORS) {
      const candidates = Array.from(this.document.querySelectorAll(selector));
      const container = candidates.find((element) => isScrollable(element) && canScrollInDirection(element, direction));
      if (container) {
        return container;
      }
    }

    return Array.from(this.document.querySelectorAll("*")).find((element) => {
      if (!isScrollable(element) || !canScrollInDirection(element, direction) || !isVisible(element)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.height >= this.window.innerHeight * 0.55 && rect.width >= this.window.innerWidth * 0.45;
    }) || null;
  }
}

function visibleArea(element) {
  const rect = element.getBoundingClientRect();
  const viewportWidth = element.ownerDocument.defaultView.innerWidth;
  const viewportHeight = element.ownerDocument.defaultView.innerHeight;
  const width = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
  const height = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  return width * height;
}

function findFirstClickable(doc, selectors) {
  for (const selector of selectors) {
    const element = Array.from(doc.querySelectorAll(selector)).find(isVisible);
    if (!element) {
      continue;
    }
    return element.closest("button,[role='button'],a") || element;
  }
  return null;
}

function findFirstElement(root, selectors) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

function findScrollableSurface(root, direction) {
  if (isScrollable(root) && canScrollInDirection(root, direction)) {
    return root;
  }

  const candidates = Array.from(root.querySelectorAll("*"))
    .filter((element) => isScrollable(element))
    .sort((a, b) => scrollCapacity(b) - scrollCapacity(a));

  return candidates.find((element) => canScrollInDirection(element, direction)) || candidates[0] || null;
}

function scrollCapacity(element) {
  return element.scrollHeight - element.clientHeight;
}

function isScrollable(element) {
  const style = getComputedStyle(element);
  const overflowY = style.overflowY;
  return /(auto|scroll)/.test(overflowY) && element.scrollHeight > element.clientHeight + 8;
}

function canScrollInDirection(element, direction) {
  if (direction > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 4;
  }
  return element.scrollTop > 4;
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  const viewportWidth = element.ownerDocument.defaultView.innerWidth;
  const viewportHeight = element.ownerDocument.defaultView.innerHeight;
  const intersectsViewport = rect.right > 0 && rect.bottom > 0 && rect.left < viewportWidth && rect.top < viewportHeight;
  return rect.width > 0 && rect.height > 0 && intersectsViewport && getComputedStyle(element).visibility !== "hidden";
}

function isActivePanel(element) {
  if (element.closest?.("[data-open='false']")) {
    return false;
  }
  if (element.dataset.open === "false") {
    return false;
  }
  if (element.getAttribute("aria-hidden") === "true" || element.hidden) {
    return false;
  }
  return element.dataset.open === "true" || isVisible(element);
}

function isPotentialPanelElement(element) {
  if (element.matches?.("button,a,svg,path,img")) {
    return false;
  }
  if (isScrollable(element)) {
    return true;
  }
  const rect = element.getBoundingClientRect();
  return rect.height >= 180 && rect.width >= 220;
}

function hasCommentSignal(element, includeDescendants = false) {
  const text = [
    element.getAttribute("aria-label"),
    element.getAttribute("data-e2e"),
    typeof element.className === "string" ? element.className : "",
    element.id
  ].filter(Boolean).join(" ").toLowerCase();

  if (text.includes("comment")) {
    return true;
  }

  return includeDescendants && !!element.querySelector?.("[aria-label*='comment' i], [data-e2e*='comment' i]");
}
