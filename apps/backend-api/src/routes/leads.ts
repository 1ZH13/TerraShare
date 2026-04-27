import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { Lead } from "../db/schemas";
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

  const existingLead = await Lead.findOne({ email: body.email.trim().toLowerCase() });
  if (existingLead) {
    return failure(c, 409, "CONFLICT", "Email already registered as lead");
  }

  const lead = await Lead.create({
    id: `lead_${crypto.randomUUID()}`,
    email: body.email.trim().toLowerCase(),
    source: body.source || "landing",
  });

  return success(c, { id: lead.id, email: lead.email, createdAt: lead.createdAt }, 201);
});

leadRoutes.get("/", async (c) => {
  const leads = await Lead.find().sort({ createdAt: -1 }).lean();

  return success(c, {
    leads,
    total: leads.length,
  });
});