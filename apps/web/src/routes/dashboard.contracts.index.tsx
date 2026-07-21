import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import ContractsPage from "../pages/ContractsPage";

export const Route = createFileRoute("/dashboard/contracts/")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><ContractsPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
