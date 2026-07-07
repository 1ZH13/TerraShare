import { Link } from "@tanstack/react-router";
import { X, Lock } from "lucide-react";
import "./checkout.css";

export default function PaymentCancelPage() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const requestId = searchParams.get("requestId");

  return (
    <div className="co">
      <div className="co-card">
        <div className="co-icon co-icon--wait">
          <X size={40} strokeWidth={2.5} />
        </div>

        <h1 className="co-title">Pago cancelado</h1>
        <p className="co-text">
          No se realizó ningún cargo en tu tarjeta. Tu solicitud sigue pendiente y puedes intentarlo de
          nuevo cuando quieras.
        </p>

        <div className="co-actions">
          <Link
            to="/dashboard"
            className="co-btn co-btn--primary"
          >
            Volver al panel
          </Link>
          <Link to="/catalog" className="co-btn co-btn--ghost">
            Explorar terrenos
          </Link>
        </div>

        <div className="co-secure">
          <Lock size={13} /> Procesado de forma segura con Stripe
        </div>
      </div>
    </div>
  );
}
