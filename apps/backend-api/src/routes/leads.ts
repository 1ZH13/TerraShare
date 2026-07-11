import { Hono } from "hono";
import { CreateLeadSchema } from "@terrashare/shared";

import { failure, success } from "../lib/api-response";
import { validateBody } from "../lib/validate";
import { Lead } from "../db/schemas";
import type { AppEnv } from "../types";

export const leadRoutes = new Hono<AppEnv>();

leadRoutes.post("/leads", async (c) => {
  // Antes hacía `await c.req.json()` sin `.catch`: un body no-JSON caía al
  // handler y devolvía 500 en vez de 400 (hallazgo E-2, #139).
  const parsed = await validateBody(c, CreateLeadSchema);
  if (!parsed.success) return parsed.response;

  const email = parsed.data.email.trim().toLowerCase();

  const existingLead = await Lead.findOne({ email });
  if (existingLead) {
    return failure(c, 409, "CONFLICT", "Email already registered as lead");
  }

  const lead = await Lead.create({
    id: `lead_${crypto.randomUUID()}`,
    email,
    source: parsed.data.source ?? "landing",
  });

  return success(c, { id: lead.id, email: lead.email, createdAt: lead.createdAt }, 201);
});

leadRoutes.get("/leads", async (c) => {
  const leads = await Lead.find().sort({ createdAt: -1 }).lean();

  return success(c, {
    leads,
    total: leads.length,
  });
});