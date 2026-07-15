import { defineConfig, devices } from "@playwright/test";

// docs/outrun/15 "CI/CD" — a small set of E2E specs for the golden paths
// that don't require a configured AI/lead-provider key (sign-up, sign-in,
// marketing pages, health check). Flows that need real AI generation
// (Blueprint, research, outreach, campaigns) aren't covered here since
// there's no way to actually exercise them without a live API key in CI
// — pretending to test them would be worse than not testing them.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
