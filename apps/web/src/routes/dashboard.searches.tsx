import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import UserDashboardLayout from "../components/UserDashboardLayout";
import SavedSearchesPage from "../pages/SavedSearchesPage";

export const Route = createFileRoute("/dashboard/searches")({
  component: () => (
    <ProtectedRoute><UserDashboardLayout><SavedSearchesPage /></UserDashboardLayout></ProtectedRoute>
  ),
});
