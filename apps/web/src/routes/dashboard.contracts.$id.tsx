import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import ContractDetailPage from "../pages/ContractDetailPage";

export const Route = createFileRoute("/dashboard/contracts/$id")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><ContractDetailPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
