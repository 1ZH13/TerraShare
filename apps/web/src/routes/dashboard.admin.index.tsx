import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminDashboardPage from "../pages/AdminDashboardPage";

export const Route = createFileRoute("/dashboard/admin/")({
  component: () => (
    <AdminRoute><AdminLayout><AdminDashboardPage /></AdminLayout></AdminRoute>
  ),
});
