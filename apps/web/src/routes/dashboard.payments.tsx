import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import PaymentsPage from "../pages/PaymentsPage";

export const Route = createFileRoute("/dashboard/payments")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><PaymentsPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
