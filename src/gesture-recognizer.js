export const GestureAction = Object.freeze({
  SWIPE_UP: "swipeUp",
  SWIPE_DOWN: "swipeDown",
  OPEN_COMMENTS: "openComments",
  CLOSE_COMMENTS: "closeComments",
  TOGGLE_LIKE: "toggleLike",
  SEEK_FORWARD: "seekForward",
  SEEK_BACKWARD: "seekBackward"
});

const FINGER_TIPS = [8, 12, 16, 20];
const FINGER_PIPS = [6, 10, 14, 18];

export const TUNABLE_OPTIONS = Object.freeze([
  "swipeThreshold",
  "swipeWindowMs",
  "cooldownMs",
  "openHoldMs",
  "closeHoldMs",
  "pinchThreshold",
  "pinchWindowMs",
  "twoFingerHoldMs",
  "continuousScrollMs"
]);

export class GestureRecognizer {
  constructor(options = {}) {
    this.swipeThreshold = options.swipeThreshold ?? 0.065;
    this.swipeWindowMs = options.swipeWindowMs ?? 900;
    this.cooldownMs = options.cooldownMs ?? 650;
    this.openHoldMs = options.openHoldMs ?? 420;
    this.closeHoldMs = options.closeHoldMs ?? 160;
    this.pinchThreshold = options.pinchThreshold ?? 0.06;
    this.pinchWindowMs = options.pinchWindowMs ?? 650;
    this.twoFingerHoldMs = options.twoFingerHoldMs ?? 220;
    this.continuousScrollMs = options.continuousScrollMs ?? 360;
    this.samples = [];
    this.pinchSamples = [];
    this.lastActionAt = 0;
    this.twoFingerSince = 0;
    this.twoFingerDirection = 0;
    this.swipeDisarmed = false;
    this.lastSwipeDirection = 0;
    this.disarmedAt = 0;
    this.restSince = 0;
    this.lastPoint = null;
    this.openSince = 0;
    this.closedSince = 0;
    this.pinkySince = 0;
    this.pinkyEmitted = false;
    this.openEmitted = false;
    this.wasOpen = false;
  }

  reset() {
    this.samples = [];
    this.pinchSamples = [];
    this.lastActionAt = 0;
    this.twoFingerSince = 0;
    this.twoFingerDirection = 0;
    this.swipeDisarmed = false;
    this.lastSwipeDirection = 0;
    this.disarmedAt = 0;
    this.restSince = 0;
    this.lastPoint = null;
    this.openSince = 0;
    this.closedSince = 0;
    this.pinkySince = 0;
    this.pinkyEmitted = false;
    this.openEmitted = false;
    this.wasOpen = false;
  }

  configure(options = {}) {
    for (const key of TUNABLE_OPTIONS) {
      const value = options[key];
      if (Number.isFinite(value)) {
        this[key] = value;
      }
    }
    return this;
  }

  analyze(landmarks, timestamp = performance.now()) {
    if (!landmarks || landmarks.length < 21) {
      this.samples = [];
      this.pinchSamples = [];
      this.openSince = 0;
      this.closedSince = 0;
      this.pinkySince = 0;
      this.pinkyEmitted = false;
      this.lastPoint = null;
      this.swipeDisarmed = false;
      this.lastSwipeDirection = 0;
      this.restSince = 0;
      this.twoFingerSince = 0;
      this.twoFingerDirection = 0;
      return null;
    }

    const state = getHandState(landmarks);
    const point = getTrackingPoint(landmarks);
    const twoFingerDirection = state.twoFingerUp ? -1 : state.twoFingerDown ? 1 : 0;
    if (twoFingerDirection) {
      if (this.twoFingerDirection !== twoFingerDirection) {
        this.twoFingerSince = timestamp;
        this.twoFingerDirection = twoFingerDirection;
      }
      this.samples = [];
      this.lastPoint = null;
      this.swipeDisarmed = false;
      this.lastSwipeDirection = 0;
      this.restSince = 0;
    } else {
      this.twoFingerSince = 0;
      this.twoFingerDirection = 0;
    }

    if (state.pinkyOnly) {
      this.samples = [];
      this.lastPoint = null;
      this.swipeDisarmed = false;
      this.lastSwipeDirection = 0;
      this.restSince = 0;
      this.pinkySince ||= timestamp;
    } else {
      this.pinkySince = 0;
      this.pinkyEmitted = false;
    }

    if (state.canSwipe && !twoFingerDirection && !state.pinkyOnly) {
      this.updateSwipeArmState(point, timestamp);
      this.samples.push({ x: point.x, y: point.y, timestamp });
      this.samples = this.samples.filter((sample) => timestamp - sample.timestamp <= this.swipeWindowMs);
    } else {
      this.samples = [];
      this.lastPoint = null;
      this.swipeDisarmed = false;
      this.lastSwipeDirection = 0;
      this.restSince = 0;
    }

    if (state.isPinching) {
      const pinchX = (landmarks[4].x + landmarks[8].x) / 2;
      const pinchY = (landmarks[4].y + landmarks[8].y) / 2;
      this.pinchSamples.push({ x: pinchX, y: pinchY, timestamp });
      this.pinchSamples = this.pinchSamples.filter((sample) => timestamp - sample.timestamp <= this.pinchWindowMs);
    } else {
      this.pinchSamples = [];
    }

    if (state.isOpen) {
      this.openSince ||= timestamp;
      this.closedSince = 0;
      this.wasOpen = true;
    } else {
      this.openSince = 0;
      this.openEmitted = false;
      if (state.isClosed) {
        this.closedSince ||= timestamp;
      } else {
        this.closedSince = 0;
      }
    }

    if (timestamp - this.lastActionAt < this.cooldownMs) {
      return null;
    }

    const like = this.detectLikeToggle(timestamp);
    if (like) {
      this.lastActionAt = timestamp;
      this.samples = [];
      this.pinchSamples = [];
      return like;
    }

    const continuousScroll = this.detectContinuousTwoFingerScroll(timestamp);
    if (continuousScroll) {
      this.lastActionAt = timestamp;
      this.openEmitted = false;
      this.openSince = 0;
      this.pinchSamples = [];
      return continuousScroll;
    }

    const seek = this.detectSeek(timestamp);
    if (seek) {
      this.lastActionAt = timestamp;
      this.openEmitted = false;
      this.samples = [];
      this.pinchSamples = [];
      return seek;
    }

    const swipe = this.detectSwipe(timestamp);
    if (swipe) {
      this.lastActionAt = timestamp;
      this.openEmitted = false;
      this.samples = [];
      this.pinchSamples = [];
      return swipe;
    }

    if (this.wasOpen && state.isClosed && this.closedSince && timestamp - this.closedSince >= this.closeHoldMs) {
      this.lastActionAt = timestamp;
      this.wasOpen = false;
      return GestureAction.CLOSE_COMMENTS;
    }

    const openHeld = !this.swipeDisarmed && state.isOpen && this.openSince && timestamp - this.openSince >= this.openHoldMs;
    if (openHeld && !this.openEmitted) {
      this.lastActionAt = timestamp;
      this.openEmitted = true;
      this.samples = [];
      this.pinchSamples = [];
      return GestureAction.OPEN_COMMENTS;
    }

    return null;
  }

  detectSwipe(timestamp) {
    if (this.samples.length < 3) {
      return null;
    }

    const oldest = this.samples[0];
    const newest = this.samples[this.samples.length - 1];
    if (timestamp - oldest.timestamp > this.swipeWindowMs) {
      return null;
    }

    const delta = newest.y - oldest.y;
    const deltaX = newest.x - oldest.x;
    if (Math.abs(deltaX) > Math.abs(delta) * 1.35) {
      return null;
    }

    if (this.swipeDisarmed && Math.sign(delta) !== this.lastSwipeDirection) {
      return null;
    }

    if (delta <= -this.swipeThreshold) {
      this.disarmSwipe(timestamp, -1);
      return GestureAction.SWIPE_UP;
    }
    if (delta >= this.swipeThreshold) {
      this.disarmSwipe(timestamp, 1);
      return GestureAction.SWIPE_DOWN;
    }
    return null;
  }

  detectContinuousTwoFingerScroll(timestamp) {
    if (!this.twoFingerDirection || !this.twoFingerSince) {
      return null;
    }

    if (timestamp - this.twoFingerSince < this.twoFingerHoldMs) {
      return null;
    }

    if (timestamp - this.lastActionAt < this.continuousScrollMs) {
      return null;
    }

    return this.twoFingerDirection < 0 ? GestureAction.SWIPE_UP : GestureAction.SWIPE_DOWN;
  }

  detectLikeToggle(timestamp) {
    if (!this.pinkySince || this.pinkyEmitted || timestamp - this.pinkySince < 260) {
      return null;
    }

    this.pinkyEmitted = true;
    this.openSince = 0;
    this.openEmitted = false;
    return GestureAction.TOGGLE_LIKE;
  }

  updateSwipeArmState(point, timestamp) {
    const previous = this.lastPoint;
    this.lastPoint = { ...point, timestamp };
    if (!previous) {
      return;
    }

    if (!this.swipeDisarmed) {
      return;
    }

    const delta = Math.hypot(point.x - previous.x, point.y - previous.y);
    if (delta < 0.012) {
      this.restSince ||= timestamp;
    } else {
      this.restSince = 0;
    }

    const rested = this.restSince && timestamp - this.restSince >= 160;
    const timedOut = timestamp - this.disarmedAt >= 850;
    if (rested || timedOut) {
      this.swipeDisarmed = false;
      this.lastSwipeDirection = 0;
      this.restSince = 0;
      this.samples = [{ x: point.x, y: point.y, timestamp }];
    }
  }

  disarmSwipe(timestamp, direction) {
    this.swipeDisarmed = true;
    this.lastSwipeDirection = direction;
    this.disarmedAt = timestamp;
    this.restSince = 0;
    this.openSince = 0;
    this.openEmitted = false;
  }

  detectSeek(timestamp) {
    if (this.pinchSamples.length < 3) {
      return null;
    }

    const oldest = this.pinchSamples[0];
    const newest = this.pinchSamples[this.pinchSamples.length - 1];
    if (timestamp - oldest.timestamp > this.pinchWindowMs) {
      return null;
    }

    const deltaX = newest.x - oldest.x;
    const deltaY = newest.y - oldest.y;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.75) {
      return null;
    }
    if (deltaX >= this.pinchThreshold) {
      return GestureAction.SEEK_FORWARD;
    }
    if (deltaX <= -this.pinchThreshold) {
      return GestureAction.SEEK_BACKWARD;
    }
    return null;
  }
}

export function getTrackingPoint(landmarks) {
  return landmarks[8];
}

export function getHandState(landmarks) {
  const wrist = landmarks[0];
  const palmWidth = Math.max(0.001, distance2d(landmarks[5], landmarks[17]));
  const extendedFingers = FINGER_TIPS.map((tip, index) => {
    const pip = FINGER_PIPS[index];
    const tipFromWrist = distance2d(landmarks[tip], wrist);
    const pipFromWrist = distance2d(landmarks[pip], wrist);
    const pointsUp = landmarks[tip].y < landmarks[pip].y - palmWidth * 0.08;
    const reachesOut = tipFromWrist > pipFromWrist + palmWidth * 0.18;
    return pointsUp || reachesOut;
  });
  const extended = extendedFingers.filter(Boolean).length;
  const [indexExtended, middleExtended, ringExtended, pinkyExtended] = extendedFingers;

  const thumbSpread = distance2d(landmarks[4], landmarks[9]);
  const thumbIndexDistance = distance2d(landmarks[4], landmarks[8]);
  const thumbOpen = thumbSpread > palmWidth * 0.75;
  const openScore = extended + (thumbOpen ? 1 : 0);
  const foldedFingers = FINGER_TIPS.reduce((count, tip) => {
    return count + (distance2d(landmarks[tip], wrist) < palmWidth * 1.9 ? 1 : 0);
  }, 0);
  const twoFingerTipY = (landmarks[8].y + landmarks[12].y) / 2;
  const twoFingerBaseY = (landmarks[5].y + landmarks[9].y) / 2;
  const twoFingerUpPose = indexExtended && middleExtended && !ringExtended && !pinkyExtended;
  const foldedRingAndPinky = foldedFingers >= 2 && !ringExtended && !pinkyExtended;
  const twoFingerUp = twoFingerUpPose && twoFingerTipY < twoFingerBaseY - palmWidth * 0.2;
  const twoFingerDown = foldedRingAndPinky && twoFingerTipY > twoFingerBaseY + palmWidth * 0.2;
  const pinkyOnly = pinkyExtended && !indexExtended && !middleExtended && !ringExtended;

  return {
    extended,
    thumbOpen,
    isPinching: thumbIndexDistance < palmWidth * 0.48,
    isOpen: openScore >= 4,
    isClosed: extended <= 1 && foldedFingers >= 3 && thumbSpread < palmWidth * 1.15,
    canSwipe: indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbIndexDistance >= palmWidth * 0.48,
    pinkyOnly,
    twoFingerUp,
    twoFingerDown
  };
}

function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
