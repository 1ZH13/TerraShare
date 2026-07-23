import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Pide el testing token de Clerk para que las pruebas puedan entrar con
  // sesión sin pasar por el formulario. Si faltan las claves avisa y sigue: las
  // pruebas con sesión se saltan solas y el resto de la suite corre igual.
  globalSetup: "./tests/e2e/global-setup.js",
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
  // Se levantan los DOS modos en que arranca la app, porque el montaje difiere
  // y cada uno tiene fallos propios:
  //
  // - 5173: build de producción (SPA client-only servida estáticamente). Es el
  //   artefacto que se despliega y contra el que corre la suite principal.
  // - 5174: `bun run dev`, donde TanStack Start hace SSR del documento entero.
  //
  // Probar solo producción dejaba ciego todo lo específico del SSR: así pasaron
  // desapercibidos #354 (la app nunca hidrataba en dev) y el crash de Leaflet
  // que tumbaba el catálogo (#358).
  webServer: [
    {
      command: "bun run preview:static",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      // El build tarda, por eso el timeout más alto.
      timeout: 180000
    },
    {
      command: "bunx vite dev --port 5174 --strictPort",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 180000
    }
  ],
  projects: [
    {
      name: "chromium",
      // Las `.ssr.spec.js` son del proyecto `dev-ssr`: apuntan al otro servidor.
      testIgnore: /\.ssr\.spec\.js$/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      // Mismas pruebas de interactividad, contra el servidor de desarrollo:
      // aquí el documento llega renderizado por el servidor, así que si la
      // hidratación no engancha, el marcado se ve pero nada responde.
      name: "dev-ssr",
      testMatch: /\.ssr\.spec\.js$/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5174" }
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