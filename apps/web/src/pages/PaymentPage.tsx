import { useState, useEffect } from "react";
import { shortId } from "../lib/short-id";
import type { FormEvent } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ArrowLeft, Sprout, Check, CreditCard, FileText, Flag, Lock, MessageCircle } from "lucide-react";
import { confirmPayment, createPaymentIntent, getPaymentsByRequest, getRentalRequestById } from "../services/api";
import "./deal.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentData {
  amount?: number;
  currency?: string;
  clientSecret?: string;
}

function DealNav({ requestId }: { requestId?: string }) {
  return (
    <nav className="dl-nav">
      <Link to="/dashboard" className="dl-nav__back">
        <ArrowLeft size={17} /> Mis solicitudes
      </Link>
      <div className="dl-nav__right">
        {requestId && <span className="dl-nav__id">Trato #{requestId.slice(0, 6)}</span>}
        <span className="dl-nav__brand-mark">
          <Sprout size={22} strokeWidth={1.8} />
        </span>
      </div>
    </nav>
  );
}

function Stepper({ isSale = false }: { isSale?: boolean }) {
  return (
    <div className="dl-stepper">
      <div className="dl-step">
        <span className="dl-step__dot dl-step__dot--done">
          <Check size={17} />
        </span>
        <div className="dl-step__label dl-step__label--done">{isSale ? "Compra" : "Solicitud"}</div>
      </div>
      <div className="dl-line dl-line--done" />
      <div className="dl-step">
        <span className="dl-step__dot dl-step__dot--done">
          <Check size={17} />
        </span>
        <div className="dl-step__label dl-step__label--done">Aceptada</div>
      </div>
      <div className="dl-line dl-line--active" />
      <div className="dl-step">
        <span className="dl-step__dot dl-step__dot--active">
          <CreditCard size={16} />
        </span>
        <div className="dl-step__label dl-step__label--active">Pago</div>
      </div>
      <div className="dl-line" />
      <div className="dl-step">
        <span className="dl-step__dot">
          <FileText size={16} />
        </span>
        <div className="dl-step__label">Acuerdo</div>
      </div>
      <div className="dl-line" />
      <div className="dl-step">
        <span className="dl-step__dot">
          <Flag size={16} />
        </span>
        <div className="dl-step__label">Activo</div>
      </div>
    </div>
  );
}

function PaymentForm({
  rentalRequestId,
  amount,
  currency,
}: {
  rentalRequestId?: string;
  amount?: number;
  currency?: string;
}) {
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
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="dl-pay__error">{error}</div>}
      <div className="dl-pay__form">
        <PaymentElement />
      </div>
      <button type="submit" className="dl-pay__btn" disabled={!stripe || loading}>
        <CreditCard size={17} /> {loading ? "Procesando…" : `Pagar $${amount ?? ""} ${currency ?? ""}`}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const { requestId } = useParams({ strict: false });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [isSale, setIsSale] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setError("No se proporcionó ID de solicitud");
      setLoading(false);
      return;
    }
    const initPayment = async () => {
      try {
        // La operación del trato define la variante (alquiler 07 vs compra 28, #249).
        const req = await getRentalRequestById(requestId).catch(() => null);
        if (req?.operation === "venta") setIsSale(true);
        // Verifica contra Stripe por si ya se pagó (p. ej. sin webhook local).
        await confirmPayment(requestId).catch(() => null);
        const payments = await getPaymentsByRequest(requestId);
        if (payments.find((p) => p.status === "paid")) {
          setAlreadyPaid(true);
          setLoading(false);
          return;
        }
        const result = await createPaymentIntent({ rentalRequestId: requestId, currency: "USD" });
        if (result?.clientSecret) {
          setClientSecret(result.clientSecret);
          setPaymentData(result);
        } else {
          throw new Error("No se recibió client secret");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al inicializar el pago");
      } finally {
        setLoading(false);
      }
    };
    initPayment();
  }, [requestId]);

  if (loading) {
    return (
      <div className="dl">
        <DealNav requestId={requestId} />
        <div className="dl-state">
          <p>Preparando el pago…</p>
        </div>
      </div>
    );
  }

  if (alreadyPaid) {
    return (
      <div className="dl">
        <DealNav requestId={requestId} />
        <div className="dl-state">
          <div className="dl-state__icon">
            <Check size={30} />
          </div>
          <h2>¡Pago ya realizado!</h2>
          <p>Esta solicitud ya fue pagada anteriormente.</p>
          <Link to="/dashboard/payments" className="dl-state__cta">
            Ver mis pagos
          </Link>
        </div>
      </div>
    );
  }

  if (error || !clientSecret || !paymentData) {
    return (
      <div className="dl">
        <DealNav requestId={requestId} />
        <div className="dl-state">
          <h2>No se pudo cargar el pago</h2>
          <p>{error || "Inténtalo de nuevo en un momento."}</p>
          <Link to="/dashboard" className="dl-state__cta">
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dl">
      <DealNav requestId={requestId} />
      <div className="dl-wrap">
        <div className="dl-head">
          <div className="dl-head__top">
            <div className="dl-head__thumb" aria-hidden="true">
              <Sprout size={24} strokeWidth={1.4} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dl-head__title">{isSale ? "Trato de compra" : "Trato de alquiler"}</div>
              <div className="dl-head__meta">
                {isSale ? "Compra" : "Solicitud"} #{shortId(requestId)}
              </div>
            </div>
            <span className="dl-head__status">Aprobada · falta pago</span>
          </div>
          <Stepper isSale={isSale} />
        </div>

        <div className="dl-body">
          <div className="dl-col">
            <h3 className="dl-section-title">Actividad</h3>
            <div className="dl-timeline">
              <div>
                <div className="dl-tl__title">{isSale ? "Compra solicitada" : "Solicitud enviada"}</div>
                <div className="dl-tl__meta">
                  {isSale ? "Enviaste tu solicitud de compra" : "Enviaste tu solicitud de alquiler"}
                </div>
              </div>
              <div>
                <div className="dl-tl__title">{isSale ? "Compra aceptada" : "Solicitud aprobada"}</div>
                <div className="dl-tl__meta">
                  {isSale ? "El propietario aceptó tu compra" : "El propietario aceptó tu solicitud"}
                </div>
              </div>
              <div>
                <div className="dl-tl__title dl-tl__title--accent">Esperando tu pago</div>
                <div className="dl-tl__meta">
                  {isSale ? "Completa el pago para cerrar la compra" : "Completa el pago para activar el alquiler"}
                </div>
              </div>
            </div>

            <h3 className="dl-section-title">Mensajes</h3>
            <div className="dl-chatcard">
              {/* TODO(#149): el hilo del trato usará el backend de mensajes. */}
              <p className="dl-chat-empty">Coordina los detalles con el propietario por el chat.</p>
              <Link to="/dashboard/chats" className="dl-chat-link">
                <MessageCircle size={16} /> Abrir chat
              </Link>
            </div>
          </div>

          <div className="dl-pay">
            <div className="dl-pay__card">
              <div className="dl-pay__k">Total a pagar</div>
              <div className="dl-pay__amount">${paymentData.amount}</div>
              <div className="dl-pay__sub">
                {isSale ? "Precio de compra" : "Primer mes de alquiler"} · {paymentData.currency}
              </div>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: { colorPrimary: "#2f5138", fontFamily: "Hanken Grotesk, sans-serif" },
                  },
                }}
              >
                <PaymentForm rentalRequestId={requestId} amount={paymentData.amount} currency={paymentData.currency} />
              </Elements>
              <div className="dl-pay__cancel">
                <Link to="/dashboard">Cancelar trato</Link>
              </div>
              <div className="dl-pay__secure">
                <Lock size={13} /> Pago seguro con Stripe
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
