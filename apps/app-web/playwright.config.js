import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
<<<<<<< Updated upstream:apps/app-web/playwright.config.js
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry"
  },
  webServer: {
    command: "bun run dev -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 120000
=======
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
>>>>>>> Stashed changes:apps/web/playwright.config.js
  },
  projects: [
    {
      name: "chromium",
<<<<<<< Updated upstream:apps/app-web/playwright.config.js
      use: { ...devices["Desktop Chrome"] }
    }
  ]
=======
      use: { ...devices["Desktop Chrome"] },
    },
  ],
>>>>>>> Stashed changes:apps/web/playwright.config.js
});
