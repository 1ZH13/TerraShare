import { Hono } from "hono";
import { cors } from "hono/cors";

import { failure } from "./lib/api-response";
import { requestIdMiddleware } from "./middleware/request-id";
import { rateLimitByIP } from "./middleware/rate-limit";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { adminRoutes } from "./routes/admin";
import { landRoutes } from "./routes/lands";
import { leadRoutes } from "./routes/leads";
import { rentalRequestRoutes } from "./routes/rental-requests";
import { contractRoutes } from "./routes/contracts";
import { paymentRoutes } from "./routes/payments";
import { chatRoutes } from "./routes/chat";
import { analyticsRoutes } from "./routes/analytics";
import type { AppEnv } from "./types";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }));
  app.use("*", requestIdMiddleware);
  app.use("/api/v1/*", rateLimitByIP(100));

  app.get("/", (c) => {
    return c.json({
      service: "backend-api",
      version: "v1",
      basePath: "/api/v1",
    });
  });

  app.route("/api/v1", healthRoutes);
  app.route("/api/v1", authRoutes);
  app.route("/api/v1", adminRoutes);
  app.route("/api/v1", landRoutes);
  app.route("/api/v1", leadRoutes);
  app.route("/api/v1", rentalRequestRoutes);
  app.route("/api/v1", contractRoutes);
  app.route("/api/v1", paymentRoutes);
  app.route("/api/v1", chatRoutes);
  app.route("/api/v1", analyticsRoutes);

  app.notFound((c) => failure(c, 404, "NOT_FOUND", "Route not found"));

  app.onError((error, c) => {
    console.error("[backend-api] unhandled error", error);
    return failure(c, 500, "INTERNAL_ERROR", "Unexpected server error");
  });

  return app;
}