import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

console.log(`[backend-api] listening on port ${env.apiPort}`);

export default {
  port: env.apiPort,
  fetch: app.fetch,
};
