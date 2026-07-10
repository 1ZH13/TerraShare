import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminReportsPage from "../pages/AdminReportsPage";

export const Route = createFileRoute("/dashboard/admin/reports/")({
  component: () => (
    <AdminRoute><AdminLayout><AdminReportsPage /></AdminLayout></AdminRoute>
  ),
});
