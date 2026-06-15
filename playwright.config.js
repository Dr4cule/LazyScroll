export default {
  testDir: "./tests",
  workers: 1,
  webServer: {
    command: "node scripts/serve-tests.mjs",
    url: "http://127.0.0.1:4173/test-pages/feed.html",
    reuseExistingServer: true
  },
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 800 }
  }
};
