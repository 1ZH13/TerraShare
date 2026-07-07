import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { PaymentDto } from "@terrashare/shared";
import { Check, Clock, Lock } from "lucide-react";
import { getPaymentsByRequest } from "../services/api";
import "./checkout.css";

type Verify = "checking" | "paid" | "pending" | "error";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [verify, setVerify] = useState<Verify>("checking");
  const [payment, setPayment] = useState<PaymentDto | null>(null);

  useEffect(() => {
    if (!requestId) {
      setVerify("error");
      return;
    }
    let active = true;
    getPaymentsByRequest(requestId)
      .then((payments) => {
        if (!active) return;
        const paid = payments.find((p) => p.status === "paid");
        setPayment(paid ?? payments[0] ?? null);
        setVerify(paid ? "paid" : "pending");
      })
      .catch(() => active && setVerify("error"));
    return () => {
      active = false;
    };
  }, [requestId]);

  const isPaid = verify === "paid";

  return (
    <div className="co">
      <div className="co-card">
        <div className={`co-icon ${isPaid ? "" : "co-icon--wait"}`}>
          {isPaid ? <Check size={42} strokeWidth={2.5} /> : <Clock size={40} strokeWidth={2.2} />}
        </div>

        <h1 className="co-title">{isPaid ? "¡Pago confirmado!" : verify === "checking" ? "Verificando pago…" : "Pago en proceso"}</h1>
        <p className="co-text">
          {isPaid ? (
            <>Tu alquiler quedó activo. El propietario ya fue notificado.</>
          ) : verify === "error" ? (
            "No pudimos verificar el pago. Si ya pagaste, recibirás un correo de confirmación."
          ) : (
            "Estamos confirmando tu pago con Stripe. Esto puede tardar unos segundos."
          )}
        </p>

        {payment && (
          <div className="co-details">
            <div className="co-detail">
              <span className="co-detail__k">Monto</span>
              <span className="co-detail__v">
                ${payment.amount?.toLocaleString("es-PA")} {payment.currency ?? "USD"}
              </span>
            </div>
            <div className="co-detail">
              <span className="co-detail__k">Estado</span>
              <span className="co-detail__v">{isPaid ? "Pagado" : "Pendiente"}</span>
            </div>
            <div className="co-detail">
              <span className="co-detail__k">Referencia</span>
              <span className="co-detail__v co-detail__v--mono">{payment.id}</span>
            </div>
          </div>
        )}

        <div className="co-actions">
          <Link to="/dashboard/payments" className="co-btn co-btn--primary">
            Ver mis pagos
          </Link>
          <Link to="/dashboard" className="co-btn co-btn--ghost">
            Ir al inicio
          </Link>
        </div>

        <div className="co-secure">
          <Lock size={13} /> Procesado de forma segura con Stripe
        </div>
      </div>
    </div>
  );
}
