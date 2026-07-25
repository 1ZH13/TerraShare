import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import ReservePage from "../pages/ReservePage";

export const Route = createFileRoute("/reserve/$landId")({
  // `modo` fija la intención cuando el terreno admite «ambas» (alquiler y venta):
  // desde el detalle se elige una de las dos y aquí no hay que adivinar (#428).
  validateSearch: (search: Record<string, unknown>): { modo?: "alquiler" | "venta" } =>
    search.modo === "venta" || search.modo === "alquiler" ? { modo: search.modo } : {},
  component: () => (
    <ProtectedRoute><ReservePage /></ProtectedRoute>
  ),
});
