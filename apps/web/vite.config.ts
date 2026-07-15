import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";

// TanStack Start en modo SPA: la app es fuertemente client-side (Clerk, Leaflet
// con `window`, Stripe), así que renderizamos en cliente y prerenderizamos solo
// el shell. El plugin de Start debe ir antes de viteReact.
export default defineConfig({
  server: { port: 5173 },
  plugins: [
    tanstackStart({
      spa: { enabled: true },
      server: { prerender: { routes: [] } },
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@terrashare/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
