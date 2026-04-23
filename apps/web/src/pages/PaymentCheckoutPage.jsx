import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { createCheckoutSession } from "../services/api";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function PaymentCheckoutPage() {
  const [params] = useSearchParams();
  const rentalRequestId = params.get("requestId");

  useEffect(() => {
    if (!rentalRequestId) return;
    // Redirect to backend checkout session immediately
    const initCheckout = async () => {
      try {
        const origin = window.location.origin;
        const result = await createCheckoutSession({
          rentalRequestId,
          currency: "USD",
          successUrl: `${origin}/payments/success?paymentId={PAYMENT_ID}`,
          cancelUrl: `${origin}/payments/cancel`,
        });

        if (result?.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        }
      } catch (e) {
        console.error("Payment error:", e);
      }
    };
    initCheckout();
  }, [rentalRequestId]);

  return (
    <div className="page-shell">
      <div className="panel" style={{ textAlign: "center", padding: "3rem", marginTop: "2rem" }}>
        <h2>Redirigiendo a Stripe...</h2>
        <p>Por favor espera mientras te redirigimos al procesador de pago.</p>
        <Link to="/dashboard" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}