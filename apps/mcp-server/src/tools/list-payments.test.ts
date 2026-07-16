import { describe, expect, it } from "bun:test";
import { listPayments } from "./list-payments";

describe("list_payments tool (HU-81 #196)", () => {
  it("devuelve pagos del arrendatario", async () => {
    const result = await listPayments({
      actingUserId: "user_tenant_01",
      actingUserRole: "user",
    });
    const payments = (result as { items: unknown[] }).items;
    expect(Array.isArray(payments)).toBe(true);
    expect(payments.length).toBeGreaterThan(0);
  });

  it("devuelve todos los pagos para un administrador", async () => {
    const result = await listPayments({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const payments = (result as { items: unknown[] }).items;
    expect(Array.isArray(payments)).toBe(true);
    expect(payments.length).toBeGreaterThan(0);
  });

  it("filtra por estado", async () => {
    const result = await listPayments({
      actingUserId: "user_admin",
      actingUserRole: "admin",
      status: "paid",
    });
    const payments = (result as { items: { status: string }[] }).items;
    expect(payments.every((p) => p.status === "paid")).toBe(true);
  });

  it("devuelve array vacío si el usuario no tiene pagos", async () => {
    const result = await listPayments({
      actingUserId: "user_no_payments",
      actingUserRole: "user",
    });
    const payments = (result as { items: unknown[] }).items;
    expect(payments.length).toBe(0);
  });

  it("no expone campos internos de Mongo", async () => {
    const result = await listPayments({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const payments = (result as { items: Record<string, unknown>[] }).items;
    expect(payments.every((p) => !("_id" in p) && !("__v" in p))).toBe(true);
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      listPayments({ actingUserId: null, actingUserRole: "user" })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("incluye campos relevantes en cada pago", async () => {
    const result = await listPayments({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const payments = (result as { items: Record<string, unknown>[] }).items;
    expect(payments.length).toBeGreaterThan(0);
    const payment = payments[0];
    expect(payment).toHaveProperty("id");
    expect(payment).toHaveProperty("rentalRequestId");
    expect(payment).toHaveProperty("amount");
    expect(payment).toHaveProperty("status");
    expect(payment).toHaveProperty("createdAt");
  });
});