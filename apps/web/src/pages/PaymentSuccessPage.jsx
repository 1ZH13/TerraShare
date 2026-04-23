import { Link, useSearchParams } from "react-router-dom";

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const paymentId = params.get("paymentId") ?? "—";

  return (
    <div className="page-shell">
      <div className="panel" style={{ textAlign: "center", padding: "3rem", marginTop: "2rem" }}>
        <h2 style={{ color: "var(--success)" }}>Pago exitoso!</h2>
        <p>Tu pago ha sido procesado correctamente.</p>
        {paymentId && paymentId !== "{PAYMENT_ID}" && (
          <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>ID de pago: {paymentId}</p>
        )}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
          <Link to="/dashboard" className="btn btn-primary">Volver al dashboard</Link>
          <Link to="/catalog" className="btn btn-ghost">Ver catalogo</Link>
        </div>
      </div>
    </div>
  );
}