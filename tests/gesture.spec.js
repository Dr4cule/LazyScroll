import { test, expect } from "@playwright/test";
import { GestureAction, GestureRecognizer } from "../src/gesture-recognizer.js";

test("does not scroll from open palm movement", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 300 });

  expect(recognizer.analyze(openHand(0.72), 1000)).toBeNull();
  expect(recognizer.analyze(openHand(0.62), 1180)).toBeNull();
  expect(recognizer.analyze(openHand(0.50), 1360)).toBeNull();

  expect(recognizer.analyze(openHand(0.50), 1540)).toBe(GestureAction.OPEN_COMMENTS);
  expect(recognizer.analyze(openHand(0.50), 1720)).toBeNull();
  expect(recognizer.analyze(openHand(0.50), 1900)).toBeNull();

  expect(recognizer.analyze(openHand(0.54), 2100)).toBeNull();
  expect(recognizer.analyze(openHand(0.60), 2280)).toBeNull();
});

test("recognizes smaller up and down pointing-hand swipes", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 300 });

  expect(recognizer.analyze(pointingHand(0.60), 1000)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.56), 1160)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1320)).toBe(GestureAction.SWIPE_UP);

  expect(recognizer.analyze(pointingHand(0.52), 1500)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1680)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1860)).toBeNull();

  expect(recognizer.analyze(pointingHand(0.54), 2060)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.58), 2240)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.62), 2420)).toBe(GestureAction.SWIPE_DOWN);
});

test("continuously scrolls while two fingers point up or down", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 200, twoFingerHoldMs: 200, continuousScrollMs: 300 });

  expect(recognizer.analyze(twoFingerHand("up"), 1000)).toBeNull();
  expect(recognizer.analyze(twoFingerHand("up"), 1120)).toBeNull();
  expect(recognizer.analyze(twoFingerHand("up"), 1240)).toBe(GestureAction.SWIPE_UP);
  expect(recognizer.analyze(twoFingerHand("up"), 1420)).toBeNull();
  expect(recognizer.analyze(twoFingerHand("up"), 1580)).toBe(GestureAction.SWIPE_UP);

  expect(recognizer.analyze(twoFingerHand("down"), 2000)).toBeNull();
  expect(recognizer.analyze(twoFingerHand("down"), 2120)).toBeNull();
  expect(recognizer.analyze(twoFingerHand("down"), 2240)).toBe(GestureAction.SWIPE_DOWN);
  expect(recognizer.analyze(twoFingerHand("down"), 2600)).toBe(GestureAction.SWIPE_DOWN);
});

test("ignores mostly horizontal hand movement for swipes", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 300 });

  expect(recognizer.analyze(pointingHand(0.55, 0.42), 1000)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.53, 0.52), 1160)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.51, 0.64), 1320)).toBeNull();
});

test("does not treat returning to rest as a second swipe", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 200 });

  expect(recognizer.analyze(pointingHand(0.60), 1000)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.56), 1160)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1320)).toBe(GestureAction.SWIPE_UP);

  expect(recognizer.analyze(pointingHand(0.56), 1560)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.60), 1720)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.61), 1880)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.61), 2040)).toBeNull();
});

test("rearms swipes after the hand settles", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 200 });

  expect(recognizer.analyze(pointingHand(0.60), 1000)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.56), 1160)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1320)).toBe(GestureAction.SWIPE_UP);

  expect(recognizer.analyze(pointingHand(0.52), 1500)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1680)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1860)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.56), 2060)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.60), 2240)).toBe(GestureAction.SWIPE_DOWN);
});

test("rearms an opposite swipe after a short endpoint pause", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 200 });

  expect(recognizer.analyze(pointingHand(0.60), 1000)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.56), 1160)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1320)).toBe(GestureAction.SWIPE_UP);

  expect(recognizer.analyze(pointingHand(0.52), 1500)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.52), 1680)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.56), 1860)).toBeNull();
  expect(recognizer.analyze(pointingHand(0.60), 2020)).toBe(GestureAction.SWIPE_DOWN);
});

test("recognizes open palm and closing palm comment gestures", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 300, openHoldMs: 350, closeHoldMs: 150 });

  expect(recognizer.analyze(openHand(0.55), 1000)).toBeNull();
  expect(recognizer.analyze(openHand(0.55), 1200)).toBeNull();
  expect(recognizer.analyze(openHand(0.56), 1400)).toBe(GestureAction.OPEN_COMMENTS);

  expect(recognizer.analyze(closedHand(0.56), 1800)).toBeNull();
  expect(recognizer.analyze(closedHand(0.56), 1980)).toBe(GestureAction.CLOSE_COMMENTS);
});

test("does not scroll while opening or closing the hand", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 200, openHoldMs: 1000 });

  expect(recognizer.analyze(openHand(0.66), 1000)).toBeNull();
  expect(recognizer.analyze(openHand(0.52), 1160)).toBeNull();
  expect(recognizer.analyze(openHand(0.38), 1320)).toBeNull();

  expect(recognizer.analyze(closedHand(0.42), 1560)).toBeNull();
  expect(recognizer.analyze(closedHand(0.58), 1720)).toBe(GestureAction.CLOSE_COMMENTS);
  expect(recognizer.analyze(closedHand(0.72), 1880)).toBeNull();
});

test("recognizes pinch slide gestures for video seeking", () => {
  const recognizer = new GestureRecognizer({ cooldownMs: 300, pinchThreshold: 0.06 });

  expect(recognizer.analyze(pinchedHand(0.38), 1000)).toBeNull();
  expect(recognizer.analyze(pinchedHand(0.44), 1160)).toBeNull();
  expect(recognizer.analyze(pinchedHand(0.51), 1320)).toBe(GestureAction.SEEK_FORWARD);

  expect(recognizer.analyze(pinchedHand(0.58), 1700)).toBeNull();
  expect(recognizer.analyze(pinchedHand(0.50), 1860)).toBeNull();
  expect(recognizer.analyze(pinchedHand(0.42), 2020)).toBe(GestureAction.SEEK_BACKWARD);
});

function openHand(wristY) {
  const landmarks = baseHand(wristY);
  for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) {
    landmarks[pip].y = wristY - 0.18;
    landmarks[tip].y = wristY - 0.35;
  }
  landmarks[4].x = 0.18;
  landmarks[9].x = 0.48;
  landmarks[5].x = 0.40;
  landmarks[17].x = 0.62;
  return landmarks;
}

function closedHand(wristY) {
  const landmarks = baseHand(wristY);
  for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) {
    landmarks[pip].y = wristY - 0.12;
    landmarks[tip].y = wristY - 0.04;
  }
  landmarks[4].x = 0.50;
  landmarks[9].x = 0.48;
  landmarks[5].x = 0.40;
  landmarks[17].x = 0.62;
  return landmarks;
}

function pinchedHand(centerX) {
  const landmarks = baseHand(0.56);
  landmarks[5].x = centerX - 0.14;
  landmarks[17].x = centerX + 0.14;
  landmarks[9].x = centerX;
  landmarks[4].x = centerX - 0.015;
  landmarks[4].y = 0.34;
  landmarks[8].x = centerX + 0.015;
  landmarks[8].y = 0.35;

  for (const [tip, pip] of [[12, 10], [16, 14], [20, 18]]) {
    landmarks[pip].y = 0.44;
    landmarks[tip].y = 0.50;
  }
  landmarks[6].y = 0.40;
  return landmarks;
}

function pointingHand(centerY, centerX = 0.5) {
  const landmarks = baseHand(centerY + 0.18);
  landmarks[0].x = centerX;
  landmarks[0].y = centerY + 0.18;
  landmarks[4].x = centerX - 0.02;
  landmarks[4].y = centerY + 0.06;
  landmarks[5].x = centerX - 0.08;
  landmarks[5].y = centerY + 0.02;
  landmarks[6].x = centerX - 0.04;
  landmarks[6].y = centerY - 0.03;
  landmarks[9].x = centerX;
  landmarks[9].y = centerY;
  landmarks[10].x = centerX + 0.02;
  landmarks[10].y = centerY + 0.04;
  landmarks[13].x = centerX + 0.06;
  landmarks[13].y = centerY + 0.02;
  landmarks[14].x = centerX + 0.07;
  landmarks[14].y = centerY + 0.05;
  landmarks[17].x = centerX + 0.12;
  landmarks[17].y = centerY + 0.04;
  landmarks[18].x = centerX + 0.12;
  landmarks[18].y = centerY + 0.07;
  landmarks[8].x = centerX + 0.01;
  landmarks[8].y = centerY - 0.09;
  landmarks[12].x = centerX + 0.03;
  landmarks[12].y = centerY + 0.07;
  landmarks[16].x = centerX + 0.08;
  landmarks[16].y = centerY + 0.08;
  landmarks[20].x = centerX + 0.13;
  landmarks[20].y = centerY + 0.09;
  return landmarks;
}

function twoFingerHand(direction, centerY = 0.55, centerX = 0.5) {
  const landmarks = pointingHand(centerY, centerX);
  const sign = direction === "up" ? -1 : 1;
  landmarks[6].y = centerY + sign * 0.06;
  landmarks[8].y = centerY + sign * 0.18;
  landmarks[10].y = centerY + sign * 0.06;
  landmarks[12].y = centerY + sign * 0.18;
  landmarks[14].y = centerY + 0.05;
  landmarks[16].y = centerY + 0.08;
  landmarks[18].y = centerY + 0.07;
  landmarks[20].y = centerY + 0.09;
  return landmarks;
}

function baseHand(wristY) {
  return Array.from({ length: 21 }, (_, index) => ({
    x: 0.5 + (index % 5) * 0.01,
    y: wristY - Math.floor(index / 5) * 0.03,
    z: 0
  }));
}
