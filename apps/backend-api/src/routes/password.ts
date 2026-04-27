import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import type { AppEnv } from "../types";

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/change-password-request", requireAuth, (c) => {
  const authUser = c.get("authUser");

  return success(c, {
    message: "Password management is handled by Clerk. Redirect user to Clerk's user settings.",
    documentation: {
      clerkUserSettingsUrl: "https://dashboard.clerk.com/users/{userId}/security",
      description: "Users can change their password through Clerk's authentication dashboard.",
      alternative: "For custom password management, implement Clerk's webhooks or use Clerk's createChangePasswordEmail API.",
    },
    recommendation: "Use Clerk's built-in password management for security and compliance.",
  });
});

authRoutes.get("/password-policy", (c) => {
  return success(c, {
    policy: "managed_by_clerk",
    description: "Password requirements are enforced by Clerk's authentication settings.",
    requirements: {
      minLength: 8,
      requireNumbers: true,
      requireUppercase: false,
      allowGoogleSSO: true,
      allowMicrosoftSSO: true,
    },
    recommendation: "Users should manage passwords through Clerk's user settings for security.",
  });
});