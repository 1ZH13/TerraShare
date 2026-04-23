import { Link, useSearchParams } from "react-router-dom";

export default function PaymentCancelPage() {
  const [params] = useSearchParams();
  const paymentId = params.get("paymentId");

  return (
    <div className="page-shell">
      <div className="panel" style={{ textAlign: "center", padding: "3rem", marginTop: "2rem" }}>
        <h2 style={{ color: "var(--danger)" }}>Pago cancelado</h2>
        <p>El pago fue cancelado. No se realizo ningun cargo a tu cuenta.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
          <Link to="/dashboard" className="btn btn-ghost">Volver al dashboard</Link>
          <Link to="/catalog" className="btn btn-primary">Ver catalogo</Link>
        </div>
      </div>
    </div>
  );
}