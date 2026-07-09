import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminAuditPage from "../pages/AdminAuditPage";

export const Route = createFileRoute("/dashboard/admin/audit")({
  component: () => (
    <AdminRoute><AdminLayout><AdminAuditPage /></AdminLayout></AdminRoute>
  ),
});
