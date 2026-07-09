import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import PrivacyPage from "../pages/PrivacyPage";

export const Route = createFileRoute("/dashboard/privacy")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><PrivacyPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
