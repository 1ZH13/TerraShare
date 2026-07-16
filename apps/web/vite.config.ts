import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";

// TanStack Start: la app es fuertemente client-side (Clerk, Leaflet con `window`,
// Stripe), así que renderizamos en cliente y no prerenderizamos.
export default defineConfig({
  server: { port: 5173 },
  plugins: [
    tanstackStart({
      spa: { enabled: true },
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@terrashare/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
