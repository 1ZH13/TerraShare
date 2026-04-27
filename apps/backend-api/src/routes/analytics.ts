import { Hono } from "hono";

import { success } from "../lib/api-response";
import { requireAdmin } from "../middleware/require-auth";
import { getStore } from "../store/in-memory-db";
import type { AppEnv, AppRole } from "../types";

export const analyticsRoutes = new Hono<AppEnv>();

analyticsRoutes.use("/*", requireAdmin);

analyticsRoutes.get("/analytics/overview", (c) => {
  const store = getStore();

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const lands = Array.from(store.lands.values());
  const activeLands = lands.filter((l) => l.status === "active");

  const rentalRequests = Array.from(store.rentalRequests.values());
  const recentRequests = rentalRequests.filter((r) => r.createdAt >= thirtyDaysAgo);

  const totalRequests = rentalRequests.length;
  const approvedRequests = rentalRequests.filter(
    (r) => r.status === "approved" || r.status === "pending_payment" || r.status === "paid",
  ).length;
  const rejectedRequests = rentalRequests.filter((r) => r.status === "rejected").length;

  const requestsLast7Days = recentRequests.filter((r) => r.createdAt >= sevenDaysAgo).length;

  const landsByCategory: Record<string, number> = {};
  for (const land of activeLands) {
    for (const use of land.allowedUses) {
      landsByCategory[use] = (landsByCategory[use] || 0) + 1;
    }
  }

  let totalRevenue = 0;
  const paidPayments = Array.from(store.payments.values()).filter((p) => p.status === "paid");
  for (const payment of paidPayments) {
    totalRevenue += payment.amount;
  }

  const pendingPayments = Array.from(store.payments.values()).filter((p) => p.status === "pending" || p.status === "processing");

  const users = Array.from(store.users.values());
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

  const leads = Array.from(store.leads.values());
  const leadsLast30Days = leads.filter((l) => l.createdAt >= thirtyDaysAgo);

  const leadsBySource: Record<string, number> = {};
  for (const lead of leadsLast30Days) {
    leadsBySource[lead.source] = (leadsBySource[lead.source] || 0) + 1;
  }

  const chats = Array.from(store.chats.values());
  const activeChats = chats.filter((c) => c.status === "active");

  const visitToRequestConversion = totalRequests > 0 && leads.length > 0
    ? (totalRequests / leads.length) * 100
    : 0;

  return success(c, {
    overview: {
      totalLands: activeLands.length,
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
      newLeadsLast7Days: leadsLast30Days.filter((l) => l.createdAt >= sevenDaysAgo).length,
      newRequestsLast7Days: requestsLast7Days,
    },
  });
});

analyticsRoutes.get("/analytics/lands", (c) => {
  const store = getStore();
  const lands = Array.from(store.lands.values());
  const activeLands = lands.filter((l) => l.status === "active");

  const landsByProvince: Record<string, number> = {};
  const landsByCategory: Record<string, number> = {};
  let totalArea = 0;
  let totalPrice = 0;

  for (const land of activeLands) {
    landsByProvince[land.location.province] = (landsByProvince[land.location.province] || 0) + 1;
    for (const use of land.allowedUses) {
      landsByCategory[use] = (landsByCategory[use] || 0) + 1;
    }
    totalArea += land.area;
    totalPrice += land.priceRule.pricePerMonth;
  }

  const avgPrice = activeLands.length > 0 ? totalPrice / activeLands.length : 0;
  const avgArea = activeLands.length > 0 ? totalArea / activeLands.length : 0;

  return success(c, {
    total: activeLands.length,
    byProvince: landsByProvince,
    byCategory: landsByCategory,
    avgPricePerMonth: Math.round(avgPrice * 100) / 100,
    avgAreaHectares: Math.round(avgArea * 100) / 100,
    totalArea,
  });
});

analyticsRoutes.get("/analytics/requests", (c) => {
  const store = getStore();
  const requests = Array.from(store.rentalRequests.values());

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const recentRequests = requests.filter((r) => r.createdAt >= thirtyDaysAgo);

  const byStatus: Record<string, number> = {};
  for (const req of requests) {
    byStatus[req.status] = (byStatus[req.status] || 0) + 1;
  }

  const byIntendedUse: Record<string, number> = {};
  for (const req of recentRequests) {
    byIntendedUse[req.intendedUse] = (byIntendedUse[req.intendedUse] || 0) + 1;
  }

  const approvedLast30Days = requests.filter(
    (r) => (r.status === "approved" || r.status === "pending_payment" || r.status === "paid") && r.updatedAt >= thirtyDaysAgo,
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
    last7Days: requests.filter((r) => r.createdAt >= sevenDaysAgo).length,
    byStatus,
    byIntendedUse,
    avgTimeToApprovalHours: Math.round(avgDecisionTimeMs / (1000 * 60 * 60) * 10) / 10,
    approvalRate: requests.length > 0 ? Math.round((approvedLast30Days.length / recentRequests.length) * 100 * 10) / 10 : 0,
  });
});