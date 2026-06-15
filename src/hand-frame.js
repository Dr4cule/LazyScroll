let video = null;
let stream = null;
let landmarker = null;
let running = false;
let detectorDelegate = "GPU";
let framesSeen = 0;
let landmarksSeen = 0;
let lastNoHandStatusAt = 0;
let cpuRetryStarted = false;
let activeHandedness = null;
let activeHandCenter = null;
let activeHandLastSeenAt = 0;

start().catch((error) => {
  cleanup();
  post("error", normalizeStartMessage(error));
});

window.addEventListener("message", (event) => {
  if (event.data?.source === "lazy-scroll" && event.data.type === "stop") {
    cleanup();
  }
});

async function start() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera is not available on this page");
  }

  video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;opacity:.01;";
  document.documentElement.append(video);

  post("status", "Requesting camera");
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    audio: false
  });
  video.srcObject = stream;
  await video.play();
  await waitForVideoReady(video);
  video.width = video.videoWidth || 640;
  video.height = video.videoHeight || 480;
  post("status", `Camera ready ${video.width}x${video.height}`);

  post("status", "Loading hand runtime");
  const { FilesetResolver, HandLandmarker } = await import("../vendor/tasks-vision/vision_bundle.mjs");
  const vision = await FilesetResolver.forVisionTasks("../vendor/tasks-vision/wasm/");
  const modelBuffer = await loadModelBuffer("../vendor/models/hand_landmarker.task");

  landmarker = await createHandLandmarker(HandLandmarker, vision, modelBuffer, "GPU");
  running = true;
  post("ready");
  requestAnimationFrame(() => tick(HandLandmarker, vision, modelBuffer));
}

async function tick(HandLandmarker, vision, modelBuffer) {
  if (!running) {
    return;
  }

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    try {
      const timestamp = performance.now();
      const result = landmarker.detectForVideo(video, timestamp);
      framesSeen += 1;
      const activeLandmarks = selectActiveHand(result, timestamp);
      if (activeLandmarks) {
        landmarksSeen += 1;
        post("landmarks", {
          landmarks: activeLandmarks,
          timestamp
        });
      } else {
        reportNoHandStatus(timestamp);
        if (shouldRetryOnCpu()) {
          await retryOnCpu(HandLandmarker, vision, modelBuffer);
        }
      }
    } catch (error) {
      console.error("[Lazy Scroll] Hand detection failed", error);
      post("error", `Hand detection failed: ${shortError(error)}`);
      cleanup();
      return;
    }
  }

  requestAnimationFrame(() => tick(HandLandmarker, vision, modelBuffer));
}

async function createHandLandmarker(HandLandmarker, vision, modelBuffer, delegate) {
  const options = {
    baseOptions: {
      modelAssetBuffer: modelBuffer,
      delegate
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.25,
    minHandPresenceConfidence: 0.25,
    minTrackingConfidence: 0.25
  };

  try {
    post("status", `Starting hand model (${delegate})`);
    detectorDelegate = delegate;
    return await HandLandmarker.createFromOptions(vision, options);
  } catch (gpuError) {
    console.warn("[Lazy Scroll] GPU hand model startup failed, retrying with CPU", gpuError);
    post("status", "Retrying hand model on CPU");
    try {
      const cpuLandmarker = await HandLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: {
          modelAssetBuffer: modelBuffer,
          delegate: "CPU"
        }
      });
      detectorDelegate = "CPU";
      return cpuLandmarker;
    } catch (cpuError) {
      throw new Error(`Hand model failed: ${shortError(cpuError) || shortError(gpuError)}`);
    }
  }
}

function selectActiveHand(result, timestamp) {
  const hands = result.landmarks || [];
  if (!hands.length) {
    return null;
  }

  const handedness = result.handednesses || result.handedness || [];
  const candidates = hands.map((landmarks, index) => {
    const center = getHandCenter(landmarks);
    const label = handedness[index]?.[0]?.categoryName || handedness[index]?.[0]?.displayName || "";
    const score = handedness[index]?.[0]?.score || 0;
    return { landmarks, center, label, score };
  });

  if (activeHandedness || activeHandCenter) {
    const matching = candidates
      .map((candidate) => ({
        candidate,
        score: getActiveHandScore(candidate, timestamp)
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (matching && matching.score >= 0.2) {
      rememberActiveHand(matching.candidate, timestamp);
      return matching.candidate.landmarks;
    }
  }

  const centered = candidates.sort((a, b) => distanceToFrameCenter(a.center) - distanceToFrameCenter(b.center))[0];
  rememberActiveHand(centered, timestamp);
  return centered.landmarks;
}

function getActiveHandScore(candidate, timestamp) {
  let score = 0;
  if (candidate.label && candidate.label === activeHandedness) {
    score += 0.7;
  }
  if (activeHandCenter) {
    score += Math.max(0, 0.7 - distance2d(candidate.center, activeHandCenter) * 2.4);
  }
  if (timestamp - activeHandLastSeenAt < 1000) {
    score += 0.25;
  }
  score += candidate.score * 0.2;
  return score;
}

function rememberActiveHand(candidate, timestamp) {
  activeHandedness = candidate.label || activeHandedness;
  activeHandCenter = candidate.center;
  activeHandLastSeenAt = timestamp;
}

function getHandCenter(landmarks) {
  const indexes = [0, 5, 9, 13, 17];
  return indexes.reduce((center, index) => ({
    x: center.x + landmarks[index].x / indexes.length,
    y: center.y + landmarks[index].y / indexes.length
  }), { x: 0, y: 0 });
}

function distanceToFrameCenter(point) {
  return Math.hypot(point.x - 0.5, point.y - 0.5);
}

function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function retryOnCpu(HandLandmarker, vision, modelBuffer) {
  cpuRetryStarted = true;
  post("status", "No hand yet, switching tracker to CPU");
  landmarker?.close?.();
  landmarker = await createHandLandmarker(HandLandmarker, vision, modelBuffer, "CPU");
  framesSeen = 0;
  landmarksSeen = 0;
}

function shouldRetryOnCpu() {
  return detectorDelegate === "GPU" && !cpuRetryStarted && framesSeen >= 90 && landmarksSeen === 0;
}

function reportNoHandStatus(timestamp) {
  if (timestamp - lastNoHandStatusAt < 1800) {
    return;
  }
  lastNoHandStatusAt = timestamp;
  post("status", `Looking for hand (${detectorDelegate})`);
}

async function waitForVideoReady(cameraVideo) {
  if (cameraVideo.videoWidth > 0 && cameraVideo.videoHeight > 0 && cameraVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanupListeners();
      reject(new Error("Camera stream did not produce video frames"));
    }, 8000);

    const done = () => {
      if (cameraVideo.videoWidth > 0 && cameraVideo.videoHeight > 0) {
        cleanupListeners();
        resolve();
      }
    };

    const cleanupListeners = () => {
      window.clearTimeout(timeout);
      cameraVideo.removeEventListener("loadedmetadata", done);
      cameraVideo.removeEventListener("loadeddata", done);
      cameraVideo.removeEventListener("canplay", done);
    };

    cameraVideo.addEventListener("loadedmetadata", done);
    cameraVideo.addEventListener("loadeddata", done);
    cameraVideo.addEventListener("canplay", done);
    done();
  });
}

async function loadModelBuffer(modelUrl) {
  const response = await fetch(modelUrl);
  if (!response.ok) {
    throw new Error(`Could not load hand model (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function cleanup() {
  running = false;
  stream?.getTracks().forEach((track) => track.stop());
  video?.remove();
  landmarker?.close?.();
  stream = null;
  video = null;
  landmarker = null;
  detectorDelegate = "GPU";
  framesSeen = 0;
  landmarksSeen = 0;
  lastNoHandStatusAt = 0;
  cpuRetryStarted = false;
  activeHandedness = null;
  activeHandCenter = null;
  activeHandLastSeenAt = 0;
}

function post(type, payload) {
  const target = window.opener || parent;
  target?.postMessage({ source: "lazy-scroll-hand-frame", type, payload }, "*");
}

function normalizeStartMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "Camera permission was blocked";
  }
  if (error?.name === "NotFoundError") {
    return "No camera was found";
  }
  return shortError(error) || "Could not start hand tracking";
}

function shortError(error) {
  const message = error?.message || String(error || "");
  return message.replace(/\s+/g, " ").slice(0, 160);
}
