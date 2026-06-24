import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";

export default function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  return (
    <div className="page-shell">
      <div className="glass-panel" style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
        <h1 style={{ marginBottom: "1rem" }}>Pago cancelado</h1>
        <p>No se realizo ningun cargo en tu tarjeta.</p>
        <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>
          Tu solicitud sigue pendiente. Puedes intentar nuevamente cuando quieras.
        </p>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link to={`/dashboard${requestId ? `?request=${requestId}` : ""}`} className="btn btn-primary">
            Volver al dashboard
          </Link>
          <Link to="/catalog" className="btn btn-ghost">Explorar terrenos</Link>
        </div>
      </div>
    </div>
  );
}