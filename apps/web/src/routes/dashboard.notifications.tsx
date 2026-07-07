import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import NotificationsPage from "../pages/NotificationsPage";

export const Route = createFileRoute("/dashboard/notifications")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><NotificationsPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
