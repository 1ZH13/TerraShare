import { Hono } from "hono";

import { failure } from "./lib/api-response";
import { requestIdMiddleware } from "./middleware/request-id";
import { authRoutes } from "./routes/auth";
import { chatRoutes } from "./routes/chat";
import { contractRoutes } from "./routes/contracts";
import { healthRoutes } from "./routes/health";
import { landRoutes } from "./routes/lands";
import { paymentRoutes } from "./routes/payments";
import { rentalRequestRoutes } from "./routes/rental-requests";
import type { AppEnv } from "./types";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", requestIdMiddleware);

  app.get("/", (c) => {
    return c.json({
      service: "backend-api",
      version: "v1",
      basePath: "/api/v1",
    });
  });

  app.route("/api/v1", healthRoutes);
  app.route("/api/v1", authRoutes);
  app.route("/api/v1", landRoutes);
  app.route("/api/v1", rentalRequestRoutes);
  app.route("/api/v1", paymentRoutes);
  app.route("/api/v1", contractRoutes);
  app.route("/api/v1", chatRoutes);

  app.notFound((c) => failure(c, 404, "NOT_FOUND", "Route not found"));

  app.onError((error, c) => {
    console.error("[backend-api] unhandled error", error);
    return failure(c, 500, "INTERNAL_ERROR", "Unexpected server error");
  });

  return app;
}
