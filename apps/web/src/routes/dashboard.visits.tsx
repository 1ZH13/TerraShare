import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import VisitsPage from "../pages/VisitsPage";

export const Route = createFileRoute("/dashboard/visits")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><VisitsPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
