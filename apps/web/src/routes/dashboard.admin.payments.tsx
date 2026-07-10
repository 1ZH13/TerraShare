import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminPaymentsPage from "../pages/AdminPaymentsPage";

export const Route = createFileRoute("/dashboard/admin/payments")({
  component: () => (
    <AdminRoute><AdminLayout><AdminPaymentsPage /></AdminLayout></AdminRoute>
  ),
});
