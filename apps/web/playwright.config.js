import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }]
  ],
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry"
  },
  // El E2E prueba el build de producción (client-only, servido estáticamente),
  // no `bun run dev`: en dev, TanStack Start hace SSR e incompatibiliza con el
  // client entry usado en producción. Así se prueba el mismo artefacto que se
  // despliega. El build tarda, por eso el timeout más alto.
  webServer: {
    command: "bun run preview:static",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 180000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ]
});