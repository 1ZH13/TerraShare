import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import MyLandsPage from "../pages/MyLandsPage";

export const Route = createFileRoute("/dashboard/lands/")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><MyLandsPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
