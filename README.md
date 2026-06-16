<p align="center">
  <img src="icons/icon-128.png" width="96" height="96" alt="Lazy Scroll icon">
</p>

<h1 align="center">Lazy Scroll</h1>

<p align="center">
  Hands-free scrolling for YouTube Shorts, Instagram Reels, TikTok, and vertical video feeds.
</p>

<p align="center">
  <img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-MV3-2563eb">
  <img alt="Tests" src="https://img.shields.io/badge/tests-19%20passing-16a34a">
  <img alt="License" src="https://img.shields.io/badge/license-ISC-475569">
</p>

Lazy Scroll is a Chrome Manifest V3 extension that turns webcam hand gestures into feed actions. It runs the bundled MediaPipe hand model locally, shows a small on-page control, and only activates on URLs in your allow-list.

## Highlights

- Control vertical feeds without touching the keyboard or mouse.
- Works with YouTube Shorts, Instagram Reels, TikTok, and custom vertical feed pages.
- Uses local MediaPipe Tasks Vision assets from `vendor/`; no CDN is required at runtime.
- Lets you stop camera tracking from the overlay at any time.
- Routes swipes into comments when comments are open, instead of accidentally moving the main reel.
- Includes a popup allow-list with one-click Add current page support.
- Ships with Playwright coverage for gestures, local integration behavior, packaged extension startup, and MediaPipe loading.

## Gesture Map

| Gesture | Action |
| --- | --- |
| Point with index finger and swipe up | Next reel or feed item |
| Point with index finger and swipe down | Previous reel or feed item |
| Hold two fingers up or down | Continuous scroll in that direction |
| Hold open palm | Open comments |
| Close palm into fist | Close comments |
| Hold pinky finger up | Like or unlike the active reel |
| Pinch thumb and index, slide right | Seek video forward |
| Pinch thumb and index, slide left | Seek video backward |

When a comments panel is open, swipe gestures scroll the comments surface first. Lazy Scroll looks for nested comments scrollers too, which helps with Instagram-style drawers and dialogs.

## Privacy And Security

- Hand detection runs locally in the browser with the bundled model in `vendor/models/hand_landmarker.task`.
- The extension requests camera access only after you click Start in the overlay.
- The overlay now has a Stop button so you can immediately stop the camera stream.
- Hand landmarks travel from the tracker frame to the content script over a private `MessageChannel`, not public window messages.
- The extension stores only your allowed site URL list in `chrome.storage.local`.
- The manifest uses `storage` and `activeTab`; `activeTab` powers Add current page in the popup.
- The content script is injected broadly so custom sites can be supported, but the app mounts only when the current URL matches your allow-list.

## Install In Chrome

1. Run dependencies once:

```powershell
npm install
```

2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select this project folder.
6. Open a supported page such as:

```text
https://www.youtube.com/shorts
https://www.instagram.com/reel
https://www.instagram.com/reels
https://www.tiktok.com
```

7. Click Start in the Lazy Scroll overlay and allow camera access.

The same unpacked extension flow works in Microsoft Edge and other Chromium browsers. Firefox is not supported by this MV3 build.

## Configure Sites

Open the extension popup from the browser toolbar. You can:

- click Add current page to add a smart URL prefix for the active tab
- edit allowed URLs manually
- click Save
- click Reset to restore the defaults

Allowed entries can be exact prefixes, domains, or wildcards:

```text
https://www.youtube.com/shorts
https://www.instagram.com/reel
https://www.tiktok.com
example.com
https://*.demo.test/watch/*
```

## Development

Run the full suite:

```powershell
npm test
```

Expected result:

```text
19 passed
```

Useful focused commands:

```powershell
npm run test:unit
npm run test:e2e
npm run test:extension
npm run audit
```

The tests start a local server on `http://127.0.0.1:4173` and exercise the extension against local pages in `test-pages/`.

## Project Layout

```text
background.js                 Default allow-list setup and migrations
content.js                    URL gate, route watcher, app mount/unmount
popup.html/css/js             Toolbar popup and site allow-list editor
manifest.json                 Chrome MV3 extension manifest
src/app.js                    Overlay, recognizer, provider, and adapter coordinator
src/gesture-recognizer.js     Landmark-to-action gesture recognition
src/mediapipe-provider.js     Tracker frame/popup lifecycle and private message channel
src/hand-frame.js             Camera startup and MediaPipe hand tracking
src/site-adapter.js           YouTube/Instagram/TikTok/page action adapter
src/site-config.js            Defaults, allow-list matching, current-page suggestions
src/overlay.js                On-page Start/Stop/status widget
test-pages/                   Local vertical feed and extension test pages
tests/                        Playwright unit, integration, and extension tests
vendor/                       Bundled MediaPipe runtime, wasm, and hand model
icons/                        Extension icons used by Chrome and this README
```

## Manual Checklist

After loading the extension:

1. Confirm the overlay appears only on allowed URLs.
2. Click Start and wait for Watching gestures.
3. Swipe up for next and down for previous.
4. Hold pinky up and confirm Like or Unlike toggles.
5. Hold open palm and confirm comments open.
6. Swipe while comments are open and confirm only comments move.
7. Close your palm into a fist and confirm comments close.
8. Pinch-slide left and right to seek.
9. Click Stop and confirm the overlay returns to Start.

## Troubleshooting

- If the overlay does not appear, add the page in the popup or click Reset to restore defaults.
- If Start fails, check that camera permission is allowed for the site.
- If Instagram opens a small camera tracker window, keep it open while using gestures.
- If hand detection is unreliable, improve lighting and keep one hand centered in the webcam frame.
- If a site changes its DOM, update selectors in `src/site-adapter.js` and add a local regression test.

## License

ISC
