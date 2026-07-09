import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminReconciliationPage from "../pages/AdminReconciliationPage";

export const Route = createFileRoute("/dashboard/admin/reconciliation")({
  component: () => (
    <AdminRoute><AdminLayout><AdminReconciliationPage /></AdminLayout></AdminRoute>
  ),
});
