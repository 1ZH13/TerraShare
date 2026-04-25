import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPaymentsByRequest } from "../services/api";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [status, setStatus] = useState("verificando...");

  useEffect(() => {
    if (!requestId) {
      setStatus("Sin ID de solicitud");
      return;
    }

    const checkPayment = async () => {
      try {
        const payments = await getPaymentsByRequest(requestId);
        const paidPayment = payments.find((p) => p.status === "paid");
        if (paidPayment) {
          setStatus("Pago confirmado ✓");
        } else {
          setStatus("Pago pendiente - esperando confirmación de Stripe");
        }
      } catch {
        setStatus("No se pudo verificar el pago");
      }
    };

    checkPayment();
  }, [requestId]);

  return (
    <div className="page-shell">
      <div className="glass-panel" style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
        <h1 style={{ marginBottom: "1rem" }}>¡Pago exitoso!</h1>
        <p>{status}</p>
        <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>Recibirás un email de confirmación de Stripe.</p>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link to="/dashboard" className="btn btn-primary">Ver dashboard</Link>
          <Link to="/catalog" className="btn btn-ghost">Explorar más</Link>
        </div>
      </div>
    </div>
  );
}