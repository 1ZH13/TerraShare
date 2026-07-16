import { beforeEach, describe, expect, it } from "bun:test";

import mongoose from "@backend/db/mongoose";
import { Payment, RentalRequest } from "@backend/db/schemas";
import { getAnalyticsOverview } from "./get-analytics-overview";

const now = new Date().toISOString();

// El preload siembra los terrenos (land_a/b/c activos, land_inactive inactivo).
// Sembramos solicitudes y pagos en beforeEach (no en el cuerpo del test).
beforeEach(async () => {
  await RentalRequest.deleteMany({});
  await Payment.deleteMany({});
  await mongoose.connection.db!.collection("rentalrequests").insertMany([
    { id: "rr_ap", landId: "land_a", tenantId: "u1", operation: "alquiler", status: "approved", createdAt: now, updatedAt: now },
    { id: "rr_re", landId: "land_a", tenantId: "u2", operation: "alquiler", status: "rejected", createdAt: now, updatedAt: now },
    { id: "rr_pe", landId: "land_b", tenantId: "u3", operation: "alquiler", status: "pending_owner", createdAt: now, updatedAt: now },
  ]);
  await mongoose.connection.db!.collection("payments").insertMany([
    { id: "pay_ok", rentalRequestId: "rr_ap", amount: 300, currency: "USD", status: "paid" },
    { id: "pay_wait", rentalRequestId: "rr_ap", amount: 500, currency: "USD", status: "pending" },
  ]);
});

describe("get_analytics_overview tool (HU-88 #205)", () => {
  it("agrega los terrenos activos por categoría (excluye inactivos)", async () => {
    const res = await getAnalyticsOverview();
    // land_a (agricultura), land_b (ganaderia), land_c (forestal); land_inactive excluido.
    expect(res.lands.total).toBe(3);
    expect(res.lands.byCategory.agricultura).toBe(1);
    expect(res.lands.byCategory.ganaderia).toBe(1);
    expect(res.lands.byCategory.forestal).toBe(1);
  });

  it("agrega las solicitudes por estado y buckets", async () => {
    const res = await getAnalyticsOverview();
    expect(res.requests.total).toBe(3);
    expect(res.requests.approved).toBe(1);
    expect(res.requests.rejected).toBe(1);
    expect(res.requests.pending).toBe(1);
    expect(res.requests.byStatus.approved).toBe(1);
    expect(res.requests.byStatus.rejected).toBe(1);
    expect(res.requests.byStatus.pending_owner).toBe(1);
    expect(res.requests.last7Days).toBe(3);
    expect(res.requests.last30Days).toBe(3);
  });

  it("agrega los pagos: ingresos pagados y pendientes", async () => {
    const res = await getAnalyticsOverview();
    expect(res.payments.total).toBe(2);
    expect(res.payments.totalRevenue).toBe(300);
    expect(res.payments.pendingRevenue).toBe(500);
    expect(res.payments.byStatus.paid).toBe(1);
    expect(res.payments.byStatus.pending).toBe(1);
  });

  it("incluye el total y activos de usuarios", async () => {
    const res = await getAnalyticsOverview();
    // Preload: user_admin, user_regular, user_seed, user_tenant_01, user_other
    // (activos) y user_blocked (bloqueado).
    expect(res.users.total).toBe(6);
    expect(res.users.active).toBe(5);
  });

  describe("sin solicitudes ni pagos", () => {
    // Se limpia en el hook (no en el cuerpo del test) tras la siembra del outer.
    beforeEach(async () => {
      await RentalRequest.deleteMany({});
      await Payment.deleteMany({});
    });

    it("devuelve ceros pero conserva los terrenos del preload", async () => {
      const res = await getAnalyticsOverview();
      expect(res.requests.total).toBe(0);
      expect(res.requests.approved).toBe(0);
      expect(res.payments.total).toBe(0);
      expect(res.payments.totalRevenue).toBe(0);
      expect(res.lands.total).toBe(3);
    });
  });
});
