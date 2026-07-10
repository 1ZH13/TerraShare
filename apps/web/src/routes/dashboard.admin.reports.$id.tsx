import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminReportDetailPage from "../pages/AdminReportDetailPage";

export const Route = createFileRoute("/dashboard/admin/reports/$id")({
  component: () => (
    <AdminRoute><AdminLayout><AdminReportDetailPage /></AdminLayout></AdminRoute>
  ),
});
