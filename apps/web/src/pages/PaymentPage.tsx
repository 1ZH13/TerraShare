import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createPaymentIntent, getPaymentsByRequest } from "../services/api";
import PublicHeader from "../components/PublicHeader";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentData {
  amount?: number;
  currency?: string;
  clientSecret?: string;
}

interface PaymentFormProps {
  rentalRequestId?: string;
  amount?: number;
  currency?: string;
  onError?: (msg?: string) => void;
}

function PaymentForm({ rentalRequestId, amount, currency, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?requestId=${rentalRequestId}`,
      },
    });

    if (submitError) {
      setError(submitError.message || "Error al procesar el pago");
      setLoading(false);
      onError?.(submitError.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-element-wrapper">
        <PaymentElement />
      </div>
      {error && (
        <div className="toast toast-error">
          <strong>Error</strong>
          <p>{error}</p>
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={!stripe || loading}
      >
        {loading ? "Procesando..." : `Pagar $${amount} ${currency}`}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const { requestId } = useParams();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  console.log("PaymentPage requestId:", requestId);

  useEffect(() => {
    if (!requestId) {
      setError("No se proporcionó ID de solicitud");
      setLoading(false);
      return;
    }

    const initPayment = async () => {
      try {
        const payments = await getPaymentsByRequest(requestId);
        console.log("Payments:", payments);
        const paidPayment = payments.find((p) => p.status === "paid");
        if (paidPayment) {
          setAlreadyPaid(true);
          setLoading(false);
          return;
        }

        console.log("Creating payment intent for:", requestId);
        const result = await createPaymentIntent({ rentalRequestId: requestId, currency: "USD" });
        console.log("Payment intent result:", result);
        if (result?.clientSecret) {
          setClientSecret(result.clientSecret);
          setPaymentData(result);
        } else {
          throw new Error("No se recibió client secret");
        }
      } catch (err) {
        console.error("Payment init error:", err);
        setError(err instanceof Error ? err.message : "Error al inicializar el pago");
      } finally {
        setLoading(false);
      }
    };

    initPayment();
  }, [requestId]);

  if (loading) {
    return (
      <div className="page-shell">
        <PublicHeader showDashboardLink={false} />
        <main>
          <div className="glass-panel payment-loading">
            <div className="payment-spinner" />
            <p>Preparando pago...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <PublicHeader showDashboardLink={false} />
        <main>
          <div className="glass-panel payment-error">
            <h2>Error</h2>
            <p>{error}</p>
            <Link to="/dashboard" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
              Volver al dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (alreadyPaid) {
    return (
      <div className="page-shell">
        <PublicHeader showDashboardLink={false} />
        <main>
          <div className="glass-panel payment-success">
            <div className="payment-success-icon">✓</div>
            <h2>¡Pago ya realizado!</h2>
            <p>Esta solicitud ya fue pagada anteriormente.</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
              Ver dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!clientSecret || !paymentData) {
    return (
      <div className="page-shell">
        <PublicHeader showDashboardLink={false} />
        <main>
          <div className="glass-panel payment-error">
            <h2>No se pudo cargar el formulario</h2>
            <Link to="/dashboard" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
              Volver al dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />
      <PublicHeader showDashboardLink={false} />
      <main>
        <Link to="/dashboard" className="back-link-text">← Volver al dashboard</Link>

        <div className="payment-layout">
          <div className="glass-panel payment-summary">
            <h2>Resumen del pago</h2>
            <div className="payment-amount">
              <span className="payment-amount-value">${paymentData.amount}</span>
              <span className="payment-amount-currency">{paymentData.currency}</span>
            </div>
            <div className="payment-detail">
              <span>Solicitud</span>
              <span>#{requestId?.slice(0, 8)}</span>
            </div>
          </div>

          <div className="glass-panel payment-form-panel">
            <h2>Datos de pago</h2>
            <p className="payment-form-subtitle">Ingresa los datos de tu tarjeta</p>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#0b5f37", fontFamily: "Space Grotesk, sans-serif" } } }}>
              <PaymentForm
                rentalRequestId={requestId}
                amount={paymentData.amount}
                currency={paymentData.currency}
                onError={(err) => setError(err ?? "")}
              />
            </Elements>
            <p className="payment-secure">
              🔒 Tus datos están protegidos con encriptación SSL
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}