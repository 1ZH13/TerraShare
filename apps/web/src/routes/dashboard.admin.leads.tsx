import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "../components/route-guards";
import AdminLayout from "../components/AdminLayout";
import AdminLeadsPage from "../pages/AdminLeadsPage";

export const Route = createFileRoute("/dashboard/admin/leads")({
  component: () => (
    <AdminRoute><AdminLayout><AdminLeadsPage /></AdminLayout></AdminRoute>
  ),
});
