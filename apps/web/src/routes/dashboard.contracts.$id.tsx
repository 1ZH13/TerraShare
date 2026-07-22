import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import ContractDetailPage from "../pages/ContractDetailPage";

export const Route = createFileRoute("/dashboard/contracts/$id")({
  component: () => (
    <ProtectedRoute>
      {/* Entrando por enlace directo, «volver» debe llevar al listado de
          contratos, no al inicio de la cuenta (#377). */}
      <UserDashboardLayout backTo="/dashboard/contracts">
        <ContractDetailPage />
      </UserDashboardLayout>
    </ProtectedRoute>
  ),
});
