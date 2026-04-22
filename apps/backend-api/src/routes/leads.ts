import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { getStore } from "../store/in-memory-db";
import type { AppEnv } from "../types";

export const leadRoutes = new Hono<AppEnv>();

leadRoutes.post("/", async (c) => {
  const body = await c.req.json();

  if (!body.email || typeof body.email !== "string") {
    return failure(c, 400, "VALIDATION_ERROR", "email is required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid email format");
  }

  // Check for duplicate
  const store = getStore();
  for (const [, lead] of store.leads) {
    if (lead.email.toLowerCase() === body.email.toLowerCase()) {
      return failure(c, 409, "CONFLICT", "Email already registered as lead");
    }
  }

  const now = new Date().toISOString();
  const lead = {
    id: `lead_${crypto.randomUUID()}`,
    email: body.email.trim().toLowerCase(),
    source: (body.source as "landing" | "app-web" | "admin-dashboard") ?? "landing",
    createdAt: now,
  };

  store.leads.set(lead.id, lead);

  return success(c, { id: lead.id, email: lead.email, createdAt: lead.createdAt }, 201);
});

leadRoutes.get("/", async (c) => {
  const store = getStore();
  const leads = Array.from(store.leads.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return success(c, {
    leads,
    total: leads.length,
  });
});