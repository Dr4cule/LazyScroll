# Lazy Scroll

Lazy Scroll is a Chrome MV3 browser extension that lets you control vertical video feeds with hand gestures. It is built for Instagram Reels, YouTube Shorts, TikTok, and similar full-screen scrolling video pages.

## What It Does

Lazy Scroll watches your hand through your webcam and turns gestures into page actions:

- Swipe hand up: move to the next reel, short, TikTok, or vertical feed item.
- Swipe hand down: move to the previous reel, short, TikTok, or vertical feed item.
- Hold an open palm: open the comments section.
- Close an open palm into a fist: close the comments section.
- Pinch thumb and index finger, then slide right: seek the active video forward a little.
- Pinch thumb and index finger, then slide left: seek the active video backward a little.

When comments are open, swipe up and swipe down scroll inside the comments section instead of moving the main feed.

The extension only runs on URLs saved in the Lazy Scroll popup. By default, it is enabled for YouTube Shorts, Instagram Reels, and TikTok.

## How The Project Works

The extension is split into small pieces so each part has one job.

### `manifest.json`

This is the browser extension manifest. It tells Chrome:

- the extension name is `Lazy Scroll`
- it is a Manifest V3 extension
- it needs camera/video capture permission
- it can be injected into normal `http` and `https` pages
- it can load the local MediaPipe model and runtime files bundled in `vendor/`

The content script checks the saved allow-list before mounting the gesture overlay, so Lazy Scroll stays dormant on pages that are not in your popup settings.

### `content.js`

This is the content script Chrome injects into pages. It loads the saved site list from `chrome.storage.local`, checks whether the current URL is allowed, and only then imports the main app from `src/app.js`.

It also listens for popup setting changes. If you add the current page to the allow-list, Lazy Scroll can mount without reinstalling the extension.

### `popup.html`, `popup.css`, and `popup.js`

These files create the browser toolbar dropdown. Use it to edit the URLs where Lazy Scroll should run.

Each line can be:

- a full URL prefix, like `https://www.youtube.com/shorts`
- a domain, like `tiktok.com`
- a wildcard pattern, like `https://*.example.com/watch/*`

The popup saves the list to Chrome extension storage.

### `src/site-config.js`

This owns URL allow-list logic. It stores the default sites, normalizes user-entered lines, loads/saves settings, and decides whether the current page should run Lazy Scroll.

### `src/app.js`

This is the main coordinator. It creates:

- the on-page Lazy Scroll status overlay
- the hand gesture recognizer
- the site adapter that performs page actions
- the MediaPipe hand tracking provider

It starts the camera, receives hand landmarks, asks the recognizer whether a gesture happened, and sends the resulting action to the site adapter.

### `src/mediapipe-provider.js`

This file owns camera and hand tracking. It:

- asks the browser for webcam access
- loads MediaPipe Tasks Vision from `vendor/tasks-vision`
- loads the hand landmark model from `vendor/models/hand_landmarker.task`
- runs hand detection every animation frame
- sends the detected hand landmarks to the app

The model and wasm runtime are stored locally so the extension does not need to fetch tracking code from a CDN while running.

Camera startup is click-driven from the overlay Start button. The provider asks for the camera first, then loads the wasm runtime, fetches the hand model as a local buffer, and falls back from GPU to CPU if GPU model startup fails.

### `src/gesture-recognizer.js`

This turns raw hand landmarks into gestures.

It tracks:

- wrist movement over time for swipe up/down
- open-palm hold for opening comments
- open-palm-to-fist transition for closing comments
- thumb/index pinch movement for video seeking

The recognizer outputs simple action names like `swipeUp`, `openComments`, `seekForward`, and `seekBackward`.

### `src/site-adapter.js`

This converts gesture actions into actual page behavior.

It can:

- scroll the main feed using wheel, keyboard, and document scrolling fallbacks
- find and click comment buttons
- find and scroll visible comments panels
- close comments using close buttons or Escape
- find the most visible video element and change its `currentTime`
- fall back to ArrowLeft/ArrowRight keyboard events for seeking when a direct video element is not available

Social sites change their HTML often, so the adapter uses multiple selectors and generic fallbacks.

### `src/overlay.js`

This draws the small Lazy Scroll status widget on the page. It shows whether the extension is starting, watching gestures, or waiting for camera permission.

### `test-pages/feed.html`

This is a local test page that mimics the important behavior of a vertical video feed:

- main feed scrolling
- a comments drawer
- comments scrolling
- an active video that can seek forward/backward

It lets the test suite verify behavior without logging into Instagram, YouTube, or TikTok.

### `tests/`

The tests use Playwright.

- `tests/gesture.spec.js` tests raw landmark patterns against the gesture recognizer.
- `tests/e2e.spec.js` opens the local test feed in Chromium and checks scrolling, comments, and video seeking end to end.

## Install It In Chrome

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on `Developer mode` in the top-right corner.
4. Click `Load unpacked`.
5. Select this folder:

```text
c:\Bedrock\Work\LazyScroll
```

6. Open one of these pages:

```text
https://www.youtube.com/shorts
https://www.instagram.com/reels
https://www.tiktok.com
```

7. When Lazy Scroll asks for camera access, allow it.
8. Use the gestures in front of your webcam.

## Configure Allowed Sites

1. Click the Lazy Scroll extension icon in the browser toolbar.
2. In the dropdown, edit the `Allowed site URLs` box.
3. Put one URL, domain, or wildcard per line.
4. Click `Save`.
5. Refresh any already-open page if the overlay does not appear immediately.

Example allow-list:

```text
https://www.youtube.com/shorts
https://www.instagram.com/reels
https://www.tiktok.com
https://example.com/videos
https://*.my-site.test/watch/*
```

## Install It In Edge Or Other Chromium Browsers

The same unpacked-extension flow works in Microsoft Edge and most Chromium browsers.

For Edge:

1. Open `edge://extensions`.
2. Turn on Developer mode.
3. Click `Load unpacked`.
4. Select `c:\Bedrock\Work\LazyScroll`.

Firefox is not supported by this build because it is currently written as a Chrome MV3 extension.

## Test It Yourself Locally

Install dependencies first:

```powershell
npm install
```

Run all automated tests:

```powershell
npm test
```

Expected result:

```text
7 passed
```

You can also run only the gesture tests:

```powershell
npm run test:unit
```

Or only the browser integration test:

```powershell
npm run test:e2e
```

## Manual Test Checklist

After loading the extension in Chrome:

1. Open YouTube Shorts, Instagram Reels, or TikTok.
2. Confirm the Lazy Scroll overlay appears in the bottom-right corner.
3. Click `Start` in the Lazy Scroll overlay.
4. Grant camera access if prompted.
5. Wait for the overlay to say `Watching gestures`.
6. Swipe your hand up and confirm the next video opens.
7. Swipe your hand down and confirm the previous video opens.
8. Hold an open palm and confirm comments open.
9. Swipe up/down while comments are open and confirm the comments panel scrolls.
10. Close your palm into a fist and confirm comments close.
11. Pinch thumb and index finger, slide right, and confirm the video seeks forward.
12. Pinch thumb and index finger, slide left, and confirm the video seeks backward.

## Troubleshooting

If clicking `Start` does not begin tracking:

1. Make sure the current site is listed in the Lazy Scroll toolbar popup.
2. Refresh the page after changing the allowed site list.
3. Confirm the browser camera prompt was allowed.
4. Check the page is `https://` or `http://localhost`; browsers block camera access on many insecure pages.
5. Try a well-lit room and keep one hand clearly in view.

If the overlay says `Camera permission was blocked`, open the site permissions from the address bar and allow camera access, then refresh.

If the overlay says `Hand model failed`, reload the page and try again. Lazy Scroll fetches the bundled model directly and will attempt GPU startup first, then CPU startup automatically.

## Notes And Limitations

- Camera permission is required because all gesture detection runs from webcam input.
- Gesture detection runs locally in your browser using the bundled MediaPipe hand landmark model.
- Instagram, YouTube, and TikTok update their page markup frequently, so selectors may need future maintenance.
- Some sites may block direct video seeking on certain videos. In that case Lazy Scroll falls back to keyboard seek events.
- Bright lighting and keeping your hand clearly visible will make gesture recognition more reliable.
