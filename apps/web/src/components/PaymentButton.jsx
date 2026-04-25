import { useState } from "react";
import { createCheckoutSession } from "../services/api";

export default function PaymentButton({ rentalRequest, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (!rentalRequest?.id) return;

    setLoading(true);
    setError("");

    try {
      const origin = window.location.origin;
      const result = await createCheckoutSession({
        rentalRequestId: rentalRequest.id,
        currency: "USD",
        successUrl: `${origin}/checkout/success?requestId=${rentalRequest.id}`,
        cancelUrl: `${origin}/checkout/cancel?requestId=${rentalRequest.id}`,
      });

      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("No se recibió URL de pago");
      }
    } catch (err) {
      const msg = err.message || "Error al iniciar el pago";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <button
        className="btn btn-primary"
        onClick={handlePay}
        disabled={loading || rentalRequest?.status === "paid"}
      >
        {loading ? "Redirigiendo..." : "Pagar con tarjeta"}
      </button>
      {error && (
        <span style={{ color: "#e53e3e", fontSize: "0.875rem" }}>{error}</span>
      )}
    </div>
  );
}