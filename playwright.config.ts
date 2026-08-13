import { defineConfig, devices } from "@playwright/test";

/**
 * E2E + a11y suite for Selectable (task #6 quality gate).
 *
 * - Chromium only for now (Windows dev box); firefox/webkit slots are ready
 *   below — uncomment when a cross-browser runner is available.
 * - `reducedMotion: "reduced"` is set globally: the library explicitly
 *   supports it (animations drop to 1ms via CSS), which removes the 160ms
 *   panel-open animation as a timing variable. State is always asserted via
 *   `data-state` / web-first assertions, never via sleeps.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    reducedMotion: "reduced",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
  },
});
