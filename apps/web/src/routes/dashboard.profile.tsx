import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import ProfilePage from "../pages/ProfilePage";

export const Route = createFileRoute("/dashboard/profile")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><ProfilePage /></UserDashboardLayout></ProtectedRoute>
  ),
});
