import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminObservabilityPage from "../pages/AdminObservabilityPage";

export const Route = createFileRoute("/dashboard/admin/observability")({
  component: () => (
    <AdminRoute><AdminLayout><AdminObservabilityPage /></AdminLayout></AdminRoute>
  ),
});
