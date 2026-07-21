import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminSecurityPage from "../pages/AdminSecurityPage";

export const Route = createFileRoute("/dashboard/admin/security")({
  component: () => (
    <AdminRoute><AdminLayout><AdminSecurityPage /></AdminLayout></AdminRoute>
  ),
});
