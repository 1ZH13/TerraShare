import { Hono } from "hono";

import { success } from "../lib/api-response";
import { isOwnerOrAdmin } from "../lib/auth-helpers";
import { requireAuth } from "../middleware/require-auth";
import { requireAdmin } from "../middleware/require-auth";
import { Land, RentalRequest, Payment, Lead, Chat, User } from "../db/schemas";
import type { AppEnv } from "../types";

export const analyticsRoutes = new Hono<AppEnv>();

analyticsRoutes.use("/*", requireAdmin);

analyticsRoutes.get("/analytics/overview", async (c) => {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [lands, rentalRequests, payments, leads, chats, users] = await Promise.all([
    Land.find({ status: "active" }).lean(),
    RentalRequest.find().lean(),
    Payment.find().lean(),
    Lead.find().lean(),
    Chat.find().lean(),
    User.find().lean(),
  ]);

  const recentRequests = rentalRequests.filter((r) => new Date(r.createdAt) >= thirtyDaysAgo);
  const approvedRequests = rentalRequests.filter(
    (r) => r.status === "approved" || r.status === "pending_payment" || r.status === "paid",
  ).length;
  const rejectedRequests = rentalRequests.filter((r) => r.status === "rejected").length;
  const requestsLast7Days = rentalRequests.filter((r) => new Date(r.createdAt) >= sevenDaysAgo).length;

  const landsByCategory: Record<string, number> = {};
  for (const land of lands) {
    for (const use of land.allowedUses) {
      landsByCategory[use] = (landsByCategory[use] || 0) + 1;
    }
  }

  const paidPayments = payments.filter((p) => p.status === "paid");
  const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter((p) => p.status === "pending" || p.status === "processing");

  const activeUsers = users.filter((u) => u.status === "active");

  let avgTimeToDecisionMs = 0;
  const decidedRequests = rentalRequests.filter(
    (r) => r.status !== "draft" && r.status !== "pending_owner" && r.status !== "pending_payment",
  );
  if (decidedRequests.length > 0) {
    let totalDecisionTime = 0;
    for (const req of decidedRequests) {
      const created = new Date(req.createdAt).getTime();
      const updated = new Date(req.updatedAt).getTime();
      totalDecisionTime += updated - created;
    }
    avgTimeToDecisionMs = totalDecisionTime / decidedRequests.length;
  }

  const leadsLast30Days = leads.filter((l) => new Date(l.createdAt) >= thirtyDaysAgo);
  const leadsBySource: Record<string, number> = {};
  for (const lead of leadsLast30Days) {
    leadsBySource[lead.source] = (leadsBySource[lead.source] || 0) + 1;
  }

  const activeChats = chats.filter((ch) => ch.status === "active");
  const totalRequests = rentalRequests.length;

  const visitToRequestConversion = totalRequests > 0 && leads.length > 0
    ? (totalRequests / leads.length) * 100
    : 0;

  return success(c, {
    overview: {
      totalLands: lands.length,
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      totalRequests,
      approvedRequests,
      rejectedRequests,
      pendingRequests: totalRequests - approvedRequests - rejectedRequests,
      requestsLast7Days,
      totalRevenue,
      pendingRevenue: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
      avgTimeToDecisionHours: Math.round(avgTimeToDecisionMs / (1000 * 60 * 60) * 10) / 10,
      requestApprovalRate: totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100 * 10) / 10 : 0,
      visitToRequestConversion: Math.round(visitToRequestConversion * 10) / 10,
      activeChats: activeChats.length,
    },
    landsByCategory,
    leadsBySource,
    recentActivity: {
      newLeadsLast7Days: leadsLast30Days.filter((l) => new Date(l.createdAt) >= sevenDaysAgo).length,
      newRequestsLast7Days: requestsLast7Days,
    },
  });
});

analyticsRoutes.get("/analytics/lands", async (c) => {
  const lands = await Land.find({ status: "active" }).lean();

  const landsByProvince: Record<string, number> = {};
  const landsByCategory: Record<string, number> = {};
  let totalArea = 0;
  let totalPrice = 0;

  for (const land of lands) {
    landsByProvince[land.location.province] = (landsByProvince[land.location.province] || 0) + 1;
    for (const use of land.allowedUses) {
      landsByCategory[use] = (landsByCategory[use] || 0) + 1;
    }
    totalArea += land.area;
    totalPrice += land.priceRule.pricePerMonth;
  }

  const avgPrice = lands.length > 0 ? totalPrice / lands.length : 0;
  const avgArea = lands.length > 0 ? totalArea / lands.length : 0;

  return success(c, {
    total: lands.length,
    byProvince: landsByProvince,
    byCategory: landsByCategory,
    avgPricePerMonth: Math.round(avgPrice * 100) / 100,
    avgAreaHectares: Math.round(avgArea * 100) / 100,
    totalArea,
  });
});

analyticsRoutes.get("/analytics/requests", async (c) => {
  const requests = await RentalRequest.find().lean();

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const recentRequests = requests.filter((r) => new Date(r.createdAt) >= thirtyDaysAgo);

  const byStatus: Record<string, number> = {};
  for (const req of requests) {
    byStatus[req.status] = (byStatus[req.status] || 0) + 1;
  }

  const byIntendedUse: Record<string, number> = {};
  for (const req of recentRequests) {
    byIntendedUse[req.intendedUse] = (byIntendedUse[req.intendedUse] || 0) + 1;
  }

  const approvedLast30Days = requests.filter(
    (r) => (r.status === "approved" || r.status === "pending_payment" || r.status === "paid") && new Date(r.updatedAt) >= thirtyDaysAgo,
  );

  let avgDecisionTimeMs = 0;
  if (approvedLast30Days.length > 0) {
    let total = 0;
    for (const req of approvedLast30Days) {
      total += new Date(req.updatedAt).getTime() - new Date(req.createdAt).getTime();
    }
    avgDecisionTimeMs = total / approvedLast30Days.length;
  }

  return success(c, {
    total: requests.length,
    last30Days: recentRequests.length,
    last7Days: requests.filter((r) => new Date(r.createdAt) >= sevenDaysAgo).length,
    byStatus,
    byIntendedUse,
    avgTimeToApprovalHours: Math.round(avgDecisionTimeMs / (1000 * 60 * 60) * 10) / 10,
    approvalRate: requests.length > 0 ? Math.round((approvedLast30Days.length / recentRequests.length) * 100 * 10) / 10 : 0,
  });
});

analyticsRoutes.get("/analytics/owner/:ownerId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const ownerId = c.req.param("ownerId");

  if (!isOwnerOrAdmin(authUser, ownerId)) {
    return c.json({ ok: false, error: { code: "FORBIDDEN", message: "Not allowed to view this owner's analytics" } }, 403);
  }

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [ownerLands, ownerRequests, payments] = await Promise.all([
    Land.find({ ownerId }).lean(),
    RentalRequest.find().lean(),
    Payment.find().lean(),
  ]);

  const activeOwnerLands = ownerLands.filter((l) => l.status === "active");
  const ownerLandIds = new Set(activeOwnerLands.map((l) => l.id));

  const filteredRequests = ownerRequests.filter((r) => ownerLandIds.has(r.landId));
  const recentRequests = filteredRequests.filter((r) => new Date(r.createdAt) >= thirtyDaysAgo);

  const pendingOwner = filteredRequests.filter((r) => r.status === "pending_owner").length;
  const approved = filteredRequests.filter((r) => r.status === "approved" || r.status === "pending_payment" || r.status === "paid").length;
  const rejected = filteredRequests.filter((r) => r.status === "rejected").length;
  const totalRequests = filteredRequests.length;

  const landsByCategory: Record<string, number> = {};
  for (const land of activeOwnerLands) {
    for (const use of land.allowedUses) {
      landsByCategory[use] = (landsByCategory[use] || 0) + 1;
    }
  }

  let avgTimeToDecisionMs = 0;
  const decidedRequests = filteredRequests.filter(
    (r) => r.status !== "draft" && r.status !== "pending_owner" && r.status !== "pending_payment",
  );
  if (decidedRequests.length > 0) {
    let totalDecisionTime = 0;
    for (const req of decidedRequests) {
      const created = new Date(req.createdAt).getTime();
      const updated = new Date(req.updatedAt).getTime();
      totalDecisionTime += updated - created;
    }
    avgTimeToDecisionMs = totalDecisionTime / decidedRequests.length;
  }

  const approvedRequestIds = new Set(
    filteredRequests
      .filter((r) => r.status === "paid" || r.status === "approved" || r.status === "pending_payment")
      .map((r) => r.id),
  );
  const totalRevenue = payments
    .filter((p) => p.status === "paid" && approvedRequestIds.has(p.rentalRequestId))
    .reduce((sum, p) => sum + p.amount, 0);

  return success(c, {
    totalLands: activeOwnerLands.length,
    totalRequests,
    pendingOwner,
    approved,
    rejected,
    requestsLast30Days: recentRequests.length,
    requestsLast7Days: recentRequests.filter((r) => new Date(r.createdAt) >= sevenDaysAgo).length,
    avgTimeToDecisionHours: avgTimeToDecisionMs > 0 ? Math.round(avgTimeToDecisionMs / (1000 * 60 * 60) * 10) / 10 : 0,
    requestApprovalRate: totalRequests > 0 ? Math.round((approved / totalRequests) * 100 * 10) / 10 : 0,
    totalRevenue,
    landsByCategory,
  });
});