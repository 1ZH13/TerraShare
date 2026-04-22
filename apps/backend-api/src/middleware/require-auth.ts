import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";

import { env } from "../config/env";
import { failure } from "../lib/api-response";
import { mapClerkClaimsToAuthUser } from "../lib/clerk-user";
import type { AppEnv } from "../types";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(env.clerkJwksUrl));
  }
  return jwks;
}

function getBearerToken(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader) {
    return undefined;
  }
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }
  return token;
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getBearerToken(c.req.header("authorization"));
  if (!token) {
    return failure(c, 401, "UNAUTHORIZED", "Missing or invalid bearer token");
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: env.clerkIssuer,
      algorithms: ["RS256"],
    });

    const authUser = mapClerkClaimsToAuthUser(payload);
    if (authUser.status !== "active") {
      return failure(c, 403, "FORBIDDEN", "User is blocked");
    }

    c.set("authUser", authUser);
    await next();
  } catch {
    return failure(c, 401, "UNAUTHORIZED", "Invalid or expired token");
  }
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authUser = c.get("authUser");
  if (authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Admin role required");
  }
  await next();
};
