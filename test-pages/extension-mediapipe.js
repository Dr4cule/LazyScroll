const status = document.querySelector("#status");

try {
  const { FilesetResolver, HandLandmarker } = await import("../vendor/tasks-vision/vision_bundle.mjs");
  const vision = await FilesetResolver.forVisionTasks("../vendor/tasks-vision/wasm/");
  const response = await fetch("../vendor/models/hand_landmarker.task");
  const modelAssetBuffer = new Uint8Array(await response.arrayBuffer());
  const landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetBuffer,
      delegate: "CPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });
  landmarker.close();
  status.textContent = "ok";
} catch (error) {
  status.textContent = error?.message || String(error);
  console.error(error);
}
