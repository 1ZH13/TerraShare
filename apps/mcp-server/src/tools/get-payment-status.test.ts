import { describe, expect, it } from "bun:test";
import { getPaymentStatus } from "./get-payment-status";

describe("get_payment_status tool (HU-80 #195)", () => {
  it("devuelve el estado de un pago existente", async () => {
    const result = await getPaymentStatus({
      paymentId: "payment_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("payment_seed_01");
    expect((result as { status: string }).status).toBe("paid");
    expect((result as { amount: number }).amount).toBe(300);
  });

  it("permite al arrendatario ver el pago de su solicitud", async () => {
    const result = await getPaymentStatus({
      paymentId: "payment_seed_01",
      actingUserId: "user_tenant_01",
      actingUserRole: "user",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("payment_seed_01");
  });

  it("permite a un administrador ver cualquier pago", async () => {
    const result = await getPaymentStatus({
      paymentId: "payment_seed_01",
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("payment_seed_01");
  });

  it("lanza error cuando el pago no existe", async () => {
    await expect(
      getPaymentStatus({
        paymentId: "nonexistent",
        actingUserId: "user_seed",
        actingUserRole: "user",
      })
    ).rejects.toThrow("Pago no encontrado");
  });

  it("lanza error cuando el usuario no tiene permiso", async () => {
    await expect(
      getPaymentStatus({
        paymentId: "payment_seed_01",
        actingUserId: "user_other",
        actingUserRole: "user",
      })
    ).rejects.toThrow("No autorizado");
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      getPaymentStatus({
        paymentId: "payment_seed_01",
        actingUserId: null,
        actingUserRole: "user",
      })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const result = await getPaymentStatus({
      paymentId: "payment_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const payment = result as Record<string, unknown>;
    expect(payment).not.toHaveProperty("_id");
    expect(payment).not.toHaveProperty("__v");
  });

  it("incluye campos relevantes del pago", async () => {
    const result = await getPaymentStatus({
      paymentId: "payment_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const payment = result as Record<string, unknown>;
    expect(payment).toHaveProperty("id");
    expect(payment).toHaveProperty("rentalRequestId");
    expect(payment).toHaveProperty("amount");
    expect(payment).toHaveProperty("currency");
    expect(payment).toHaveProperty("status");
    expect(payment).toHaveProperty("createdAt");
  });
});
